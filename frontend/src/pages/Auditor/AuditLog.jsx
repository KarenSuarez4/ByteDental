import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Select from "../../components/Select";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TABS = [
  { key: "login", label: "Ingresos y Salidas" },
  { key: "users", label: "Gestión de Usuarios" },
  { key: "services", label: "Eventos de Servicios" },
];

function AuditLog() {
  const { token, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [loginEvents, setLoginEvents] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [serviceEvents, setServiceEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [loginFilter, setLoginFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  // llamar auditoría filtrada con fetch
  const fetchAuditEvents = async (params) => {
    const url = new URL(`${API_BASE_URL}/api/auditoria/`);
    Object.entries({ ...params, limit: 10, skip: 0 }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.append(key, value);
    });
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Error obteniendo auditoría");
    return await response.json();
  };

  useEffect(() => {
    if (userRole !== "Auditor" || !token) return;
    setLoading(true);

    // Ingresos y salidas
    let loginTypes = [];
    if (loginFilter === "ALL") loginTypes = ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT"];
    else loginTypes = [loginFilter];
    Promise.all(loginTypes.map(type => fetchAuditEvents({ event_type: type })))
      .then(results => {
        const merged = results.flat().sort((a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp)).slice(0, 10);
        setLoginEvents(merged);
      });

    // Cambios en usuarios
    let userTypes = [];
    if (userFilter === "ALL") userTypes = ["CREATE", "UPDATE", "DELETE", "DEACTIVATE", "ACTIVATE"];
    else userTypes = [userFilter];
    Promise.all(userTypes.map(type => fetchAuditEvents({ event_type: type, affected_record_type: "users" })))
      .then(results => {
        const merged = results.flat().sort((a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp)).slice(0, 10);
        setUserEvents(merged);
      });

    // Eventos de servicios
    let serviceParams = { affected_record_type: "services" };
    if (serviceFilter !== "ALL") serviceParams.event_type = serviceFilter;
    fetchAuditEvents(serviceParams)
      .then(data => setServiceEvents(data));

    setLoading(false);
  }, [token, userRole, loginFilter, userFilter, serviceFilter]);

  if (userRole !== "Auditor") return <div className="font-poppins text-center mt-20 text-xl">No autorizado</div>;
  if (loading) return <div className="font-poppins text-center mt-20 text-xl">Cargando auditoría...</div>;

  // Estilos para el header de la tabla
  const tableHeaderClass = "bg-header-blue text-white font-semibold text-center font-poppins text-[18px]";
  const tableCellClass = "text-center font-poppins text-[18px] py-2";

  return (
    <main className="flex min-h-[calc(100vh-145px)] bg-gray-50 overflow-hidden">
      {/* Aside centrado */}
      <aside className="w-100 bg-gray-0 flex flex-col justify-center items-center p-6 border-r border-gray-300 ">
        <div className="flex flex-col gap-30 items-center w-full">
          {TABS.map(tab => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full py-3 px-4 rounded-[40px] font-poppins text-[18px] font-bold shadow-md
                ${activeTab === tab.key
                  ? "bg-primary-blue text-white"
                  : "bg-header-blue text-primary-blue border border-primary-blue hover:bg-primary-blue-hover hover:text-white"}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </aside>

      {/* Contenido principal centrado */}
      <section className="flex-1 flex flex-col items-center justify-center px-3">
        <h1 className="text-header-blue text-[46px] font-bold font-poppins mb-8 text-center pb-15">
          Auditoría del Sistema
        </h1>

        {/* Filtro usando Select */}
        <div className="mb-6 w-full max-w-[1500px] flex items-center justify-start  pb-8">
          {activeTab === "login" && (
            <>
              <label className="mr-3 font-poppins text-[18px] font-semibold">Filtrar por tipo:</label>
              <Select
                value={loginFilter}
                onChange={e => setLoginFilter(e.target.value)}
                className="w-[250px] h-[50px] rounded-[40px] font-poppins text-[16px] px-6"
              >
                <option value="ALL">Todos</option>
                <option value="LOGIN_SUCCESS">Ingresos exitosos</option>
                <option value="LOGIN_FAILED">Intentos fallidos</option>
                <option value="LOGOUT">Salidas</option>
              </Select>
            </>
          )}
          {activeTab === "users" && (
            <>
              <label className="mr-3 font-poppins text-[18px] font-semibold">Filtrar por tipo:</label>
              <Select
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                className="w-[250px] h-[50px] rounded-[40px] font-poppins text-[16px] px-6"
              >
                <option value="ALL">Todos</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE">Modificaciones</option>
                <option value="DELETE">Eliminaciones</option>
                <option value="DEACTIVATE">Desactivaciones</option>
                <option value="ACTIVATE">Activaciones</option>
              </Select>
            </>
          )}
          {activeTab === "services" && (
            <>
              <label className="mr-3 font-poppins text-[18px] font-semibold">Filtrar por tipo:</label>
              <Select
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
                className="w-[250px] h-[50px] rounded-[40px] font-poppins text-[16px] px-6"
              >
                <option value="ALL">Todos</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE">Modificaciones</option>
                <option value="DELETE">Eliminaciones</option>
              </Select>
            </>
          )}
        </div>

        {/* Tabla con altura máxima */}
        <div className="w-full max-w-[1500px] bg-white rounded-[12px] shadow-md overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto">
          {activeTab === "login" && (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>IP Origen</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {loginEvents.map(ev => (
                  <tr key={ev.id}>
                    <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                    <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                    <td className={tableCellClass}>{ev.event_type}</td>
                    <td className={tableCellClass}>{ev.source_ip}</td>
                    <td className={tableCellClass}>{ev.event_description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "users" && (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Registro afectado</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {userEvents.map(ev => (
                  <tr key={ev.id}>
                    <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                    <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                    <td className={tableCellClass}>{ev.event_type}</td>
                    <td className={tableCellClass}>{ev.affected_record_id}</td>
                    <td className={tableCellClass}>{ev.event_description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "services" && (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Servicio afectado</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {serviceEvents.map(ev => (
                  <tr key={ev.id}>
                    <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                    <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                    <td className={tableCellClass}>{ev.event_type}</td>
                    <td className={tableCellClass}>{ev.affected_record_id}</td>
                    <td className={tableCellClass}>{ev.event_description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

export default AuditLog;
