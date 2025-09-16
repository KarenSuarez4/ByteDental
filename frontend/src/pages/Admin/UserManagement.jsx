import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Select from "../../components/Select";
import ConfirmDialog from "../../components/ConfirmDialog";
import { getAllUsers as getUsers, updateUser, deactivateUser, activateUser, getRoles } from "../../services/userService";

const tableHeaderClass = "bg-header-blue text-white font-semibold text-center font-poppins text-18";
const tableCellClass = "text-center font-poppins text-16 py-2";

function UserManagement() {
  const { token, userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editError, setEditError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null });
  const [phoneEditError, setPhoneEditError] = useState("");

  // Filtros y búsqueda
  const [searchDoc, setSearchDoc] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    if (userRole !== "Administrador" || !token) return;
    setLoading(true);
    getUsers(token)
      .then(setUsers)
      .catch(() => setEditError("Error cargando usuarios"))
      .finally(() => setLoading(false));
    getRoles(token)
      .then(setRoles)
      .catch(() => {});
  }, [token, userRole]);
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (editError) {
      const timer = setTimeout(() => setEditError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [editError]);

  // Abrir modal de edición
  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({
      document_number: user.document_number,
      document_type: user.document_type,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      specialty: user.specialty,
    });
    setEditError("");
    setSuccessMsg("");
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "document_number") {
      if (!/^\d*$/.test(value)) return;
      setEditForm(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
      setEditForm(prev => ({ ...prev, [name]: value }));
      if (value && value.length !== 10) {
        setPhoneEditError("Ingrese un número válido.");
      } else {
        setPhoneEditError("");
      }
      return;
    }

    setEditForm(prev => {
      // Si cambia el rol y no es Doctor, borra la especialidad
      if (name === "role_id") {
        const selectedRole = roles.find(role => role.id === parseInt(value));
        if (selectedRole?.name !== "Doctor") {
          return { ...prev, role_id: parseInt(value), specialty: "" };
        }
        return { ...prev, role_id: parseInt(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.document_type) errors.document_type = "El tipo de documento es obligatorio.";
    if (!editForm.document_number) errors.document_number = "El número de documento es obligatorio.";
    if (!editForm.first_name) errors.first_name = "El nombre es obligatorio.";
    if (!editForm.last_name) errors.last_name = "El apellido es obligatorio.";
    if (!editForm.email) errors.email = "El correo es obligatorio.";
    else if (!editForm.email.includes('@') || !editForm.email.includes('.')) errors.email = "Ingrese un correo electrónico válido.";
    if (!editForm.role_id) errors.role_id = "El rol es obligatorio.";
    if (roles.find(r => r.id === editForm.role_id)?.name === "Doctor" && !editForm.specialty)
      errors.specialty = "La especialidad es obligatoria para el rol Doctor.";
    if (editForm.phone && editForm.phone.length !== 10) {
      errors.phone = "Ingrese un número válido.";
    }

    setEditFormErrors(errors);
    setPhoneEditError(errors.phone || "");
    return Object.keys(errors).length === 0;
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    if (!validateEditForm()) return;
    try {
      await updateUser(editUser.uid, editForm, token);
      setSuccessMsg("Usuario actualizado correctamente");
      setEditUser(null);
      setLoading(true);
      const updatedUsers = await getUsers(token);
      setUsers(updatedUsers);
      setLoading(false);
      setEditFormErrors({});
    } catch (err) {
      setEditFormErrors({ general: err.message || "Error al actualizar usuario" });
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditUser(null);
    setEditError("");
    setSuccessMsg("");
  };

  // Desactivar usuario
  const handleDeactivate = async (user) => {
    try {
      await deactivateUser(user.uid, token);
      setSuccessMsg("Usuario desactivado correctamente");
      setLoading(true);
      const updatedUsers = await getUsers(token);
      setUsers(updatedUsers);
      setLoading(false);
    } catch (err) {
      setEditError(err.message || "Error al desactivar usuario");
    }
  };

  // Filtros
  const filteredUsers = users.filter(user => {
    const docMatch = searchDoc === "" || user.document_number.includes(searchDoc);
    const roleMatch = filterRole === "ALL" || user.role_id === parseInt(filterRole);
    const statusMatch = filterStatus === "ALL" || (filterStatus === "ACTIVO" ? user.is_active : !user.is_active);
    return docMatch && roleMatch && statusMatch;
  });

  const specialties = [
    "Periodoncia",
    "Endodoncia",
    "Cirugía oral y maxilofacial",
    "Odontopediatría",
  ];

  const isDoctor = roles.find(r => r.id === editForm.role_id)?.name === "Doctor";

  if (userRole !== "Administrador") return <div className="font-poppins text-center mt-20 text-xl">No autorizado</div>;
  if (loading) return <div className="font-poppins text-center mt-10 text-18">Cargando usuarios...</div>;

  return (
    <main className="flex min-h-[calc(100vh-94px)] bg-gray-50 overflow-hidden">
      <section className="flex-1 flex flex-col items-center px-3">
        <h1 className="text-header-blue text-46 font-bold font-poppins mb-1 pt-6 text-center pb-6">
          GESTIÓN DE USUARIOS
        </h1>
        {editError && (
          <div className="mb-2 w-full max-w-[900px] p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center text-18">
            {editError}
          </div>
        )}
        {successMsg && (
          <div className="mb-2 w-full max-w-[900px] p-3 bg-green-100 border border-green-400 text-green-700 rounded text-center transition-opacity duration-500 text-18">
            {successMsg}
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="w-full max-w-[1000px] flex flex-wrap items-center justify-between mb-3 gap-4">
          <div className="flex items-center gap-4">
            <Input
              className="w-[280px] h-[35px] font-poppins"
              placeholder="Buscar por documento"
              value={searchDoc}
              onChange={e => setSearchDoc(e.target.value)}
            />
            <Select
              className="w-[210px] h-[35px]  font-poppins"
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
            >
              <option value="ALL">Todos los roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
            <Select
              className="w-[180px] h-[35px] font-poppins"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </Select>
          </div>
        </div>

        {/* Tabla de usuarios con scroll vertical */}
        <div className="w-full max-w-[1000px] bg-white rounded-[12px] shadow-md overflow-x-auto"
             style={{ maxHeight: "calc(100vh - 226px)", overflowY: "auto" }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 h-10">
              <tr>
                <th className={tableHeaderClass}>Documento</th>
                <th className={tableHeaderClass}>Tipo</th>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Apellido</th>
                <th className={tableHeaderClass}>Correo</th>
                <th className={tableHeaderClass}>Teléfono</th>
                <th className={tableHeaderClass}>Rol</th>
                <th className={tableHeaderClass}>Especialidad</th>
                <th className={tableHeaderClass}>Estado</th>
                <th className={tableHeaderClass}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.uid}>
                  <td className={tableCellClass}>{user.document_number}</td>
                  <td className={tableCellClass}>{user.document_type}</td>
                  <td className={tableCellClass}>{user.first_name}</td>
                  <td className={tableCellClass}>{user.last_name}</td>
                  <td className={tableCellClass}>{user.email}</td>
                  <td className={tableCellClass}>{user.phone}</td>
                  <td className={tableCellClass}>{user.role_name}</td>
                  <td className={tableCellClass}>{user.specialty || "-"}</td>
                  <td className={tableCellClass}>
                    {user.is_active ? (
                      <span className="text-green-600 font-bold">Activo</span>
                    ) : (
                      <span className="text-red-600 font-bold">Inactivo</span>
                    )}
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      {user.is_active ? (
                        <>
                          <Button
                            className="bg-primary-blue hover:bg-primary-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                            onClick={() => handleEdit(user)}
                          >
                            Modificar
                          </Button>
                          <Button
                            className="bg-header-blue hover:bg-header-blue-hover text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                            onClick={() => setConfirmDialog({ open: true, user })}
                          >
                            Desactivar
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-[40px] font-poppins text-16 font-bold w-[130px] h-[35px]"
                          onClick={async () => {
                            try {
                              await activateUser(user.uid, token);
                              setSuccessMsg("Usuario activado correctamente");
                              setLoading(true);
                              const updatedUsers = await getUsers(token);
                              setUsers(updatedUsers);
                              setLoading(false);
                            } catch (err) {
                              setEditError(err.message || "Error al activar usuario");
                            }
                          }}
                        >
                          Activar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal de edición */}
        {editUser && (
          <div className="fixed inset-0 bg-header-blue bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-[12px] shadow-lg p-8 w-full max-w-[1200px] flex flex-col items-center justify-center">
              <h2 className="text-header-blue text-24 font-bold font-poppins mb-6 text-center">
                Editar Usuario
              </h2>
              {editFormErrors.general && (
                <div className="mb-4 w-full max-w-[600px] p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
                  {editFormErrors.general}
                </div>
              )}
              <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 justify-center items-center">
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Documento</label>
                  <Input
                    name="document_number"
                    value={editForm.document_number}
                    onChange={e => setEditForm(f => ({ ...f, document_number: e.target.value }))}
                    className="w-[320px]"
                    error={!!editFormErrors.document_number}
                  />
                  {editFormErrors.document_number && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.document_number}</p>
                  )}
                </div>
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Tipo</label>
                  <Select
                    name="document_type"
                    value={editForm.document_type}
                    onChange={e => setEditForm(f => ({ ...f, document_type: e.target.value }))}
                    className="w-[320px]"
                    error={!!editFormErrors.document_type}
                  >
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="TI">Tarjeta de Identidad</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PP">Pasaporte</option>
                  </Select>
                  {editFormErrors.document_type && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.document_type}</p>
                  )}
                </div>
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Nombre</label>
                  <Input
                    name="first_name"
                    value={editForm.first_name}
                    onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-[320px]"
                    error={!!editFormErrors.first_name}
                  />
                  {editFormErrors.first_name && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.first_name}</p>
                  )}
                </div>
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Apellido</label>
                  <Input
                    name="last_name"
                    value={editForm.last_name}
                    onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-[320px]"
                    error={!!editFormErrors.last_name}
                  />
                  {editFormErrors.last_name && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.last_name}</p>
                  )}
                </div>
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Correo</label>
                  <Input
                    name="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-[320px]"
                    error={!!editFormErrors.email}
                  />
                  {editFormErrors.email && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.email}</p>
                  )}
                </div>
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Teléfono</label>
                  <Input
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditFormChange}
                    className="w-[320px]"
                    error={!!editFormErrors.phone || !!phoneEditError}
                    maxLength={10}
                  />
                  {(editFormErrors.phone || phoneEditError) && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.phone || phoneEditError}</p>
                  )}
                </div>
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Rol</label>
                  <Select
                    name="role_id"
                    value={editForm.role_id}
                    onChange={handleEditFormChange}
                    className="w-[320px]"
                    error={!!editFormErrors.role_id}
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </Select>
                  {editFormErrors.role_id && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.role_id}</p>
                  )}
                </div>
                <div className="flex flex-col items-center w-full">
                  <label className="block font-poppins mb-2 text-center">Especialidad</label>
                  <Select
                    name="specialty"
                    value={editForm.specialty || ""}
                    onChange={handleEditFormChange}
                    disabled={!isDoctor}
                    className="w-[320px]"
                    error={!!editFormErrors.specialty}
                    placeholder="Seleccione la especialidad"
                  >
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </Select>
                  {editFormErrors.specialty && (
                    <p className="text-red-500 text-xs font-poppins mt-2">{editFormErrors.specialty}</p>
                  )}
                </div>
              </form>
              <div className="flex justify-center space-x-6 mt-8">
                <Button
                  className="bg-primary-blue hover:bg-primary-blue-hover text-white px-8 py-3 font-bold rounded-[40px] text-lg shadow-md"
                  onClick={handleSaveEdit}
                >
                  Guardar cambios
                </Button>
                <Button
                  className="bg-header-blue hover:bg-header-blue-hover text-white px-8 py-3 font-bold rounded-[40px] text-lg shadow-md"
                  onClick={handleCancelEdit}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmDialog.open}
          title="Confirmar desactivación"
          message={`¿Seguro que deseas desactivar a ${confirmDialog.user?.first_name} ${confirmDialog.user?.last_name}?`}
          onConfirm={async () => {
            await handleDeactivate(confirmDialog.user);
            setConfirmDialog({ open: false, user: null });
          }}
          onCancel={() => setConfirmDialog({ open: false, user: null })}
        />
      </section>
    </main>
  );
}

export default UserManagement;