import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import Select from "../../components/Select";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TABS = [
  { key: "login", label: "Ingresos y Salidas" },
  { key: "users", label: "Eventos de Usuarios" },
  { key: "patients", label: "Eventos de Pacientes" },
  { key: "guardians", label: "Eventos de Tutor" },
  // { key: "persons", label: "Eventos de Personas" },
  { key: "services", label: "Eventos de Servicios" },
  { key: "histories", label: "Eventos de Historias" },
];

function AuditLog() {
  const { token, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [loginEvents, setLoginEvents] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [patientEvents, setPatientEvents] = useState([]);
  const [guardianEvents, setGuardianEvents] = useState([]);
  const [personEvents, setPersonEvents] = useState([]);
  const [serviceEvents, setServiceEvents] = useState([]);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [loginFilter, setLoginFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [patientFilter, setPatientFilter] = useState("ALL"); // Filtro por tipo de evento
  const [guardianFilter, setGuardianFilter] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [historyFilter, setHistoryFilter] = useState("ALL");

  // Estados de paginación
  const [loginPagination, setLoginPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [userPagination, setUserPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [patientPagination, setPatientPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [guardianPagination, setGuardianPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [personPagination, setPersonPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [servicePagination, setServicePagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [historyPagination, setHistoryPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  

  const RECORDS_PER_PAGE = 10;

  const fetchAuditEvents = async (params, page = 1) => {
    const skip = (page - 1) * RECORDS_PER_PAGE;
    const url = new URL(`${API_BASE_URL}/api/auditoria/`);
    Object.entries({ ...params, limit: RECORDS_PER_PAGE, skip }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.append(key, value);
    });
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Error obteniendo auditoría");
    return await response.json();
  };

  const fetchAuditEventsWithCount = async (params, page = 1) => {
    // Obtener eventos paginados
    const events = await fetchAuditEvents(params, page);

    // Para obtener el total, hacer una consulta sin límite (solo los primeros 1000)
    const countUrl = new URL(`${API_BASE_URL}/api/auditoria/`);
    Object.entries({ ...params, limit: 1000, skip: 0 }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) countUrl.searchParams.append(key, value);
    });

    const countResponse = await fetch(countUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!countResponse.ok) throw new Error("Error obteniendo total de registros");
    const totalEvents = await countResponse.json();

    return {
      events,
      total: totalEvents.length,
      totalPages: Math.ceil(totalEvents.length / RECORDS_PER_PAGE)
    };
  };

  useEffect(() => {
    if (userRole !== "Auditor" || !token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Cargar todos los datos según el tab activo y reiniciar la paginación
        if (activeTab === "login") {
          await loadLoginEvents(1);
        } else if (activeTab === "users") {
          await loadUserEvents(1);
        } else if (activeTab === "patients") {
          await loadPatientEvents(1);
        } else if (activeTab === "guardians") {
          await loadGuardianEvents(1);
        } else if (activeTab === "persons") {
          await loadPersonEvents(1);
        } else if (activeTab === "services") {
          await loadServiceEvents(1);
        } else if (activeTab === "histories") {
          await loadHistoryEvents(1);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, userRole, loginFilter, userFilter, patientFilter, guardianFilter, personFilter, serviceFilter, historyFilter, activeTab]);

  const loadLoginEvents = async (page = 1) => {
    try {
      let loginTypes = [];
      if (loginFilter === "ALL") loginTypes = ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT", "ACCOUNT_LOCKED"];
      else loginTypes = [loginFilter];

      if (loginTypes.length === 1) {
        const result = await fetchAuditEventsWithCount({ event_type: loginTypes[0] }, page);
        setLoginEvents(result.events);
        setLoginPagination({
          currentPage: page,
          totalPages: result.totalPages,
          totalRecords: result.total
        });
      } else {
        // Para múltiples tipos, cargar todos y paginar en el cliente
        const results = await Promise.all(loginTypes.map(type => fetchAuditEvents({ event_type: type }, 1)));
        const merged = results.flat().sort((a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp));
        const totalPages = Math.ceil(merged.length / RECORDS_PER_PAGE);
        const startIndex = (page - 1) * RECORDS_PER_PAGE;
        const endIndex = startIndex + RECORDS_PER_PAGE;
        const paginatedEvents = merged.slice(startIndex, endIndex);

        setLoginEvents(paginatedEvents);
        setLoginPagination({
          currentPage: page,
          totalPages,
          totalRecords: merged.length
        });
      }
    } catch (error) {
      console.error("Error cargando eventos de login:", error);
    }
  };

  const loadUserEvents = async (page = 1) => {
    try {
      let userTypes = [];
      if (userFilter === "ALL") userTypes = ["CREATE", "UPDATE", "DELETE", "DEACTIVATE", "ACTIVATE"];
      else userTypes = [userFilter];

      if (userTypes.length === 1) {
        const result = await fetchAuditEventsWithCount({
          event_type: userTypes[0],
          affected_record_type: "users"
        }, page);
        setUserEvents(result.events);
        setUserPagination({
          currentPage: page,
          totalPages: result.totalPages,
          totalRecords: result.total
        });
      } else {
        // Para múltiples tipos, cargar todos y paginar en el cliente
        const results = await Promise.all(userTypes.map(type =>
          fetchAuditEvents({ event_type: type, affected_record_type: "users" }, 1)
        ));
        const merged = results.flat().sort((a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp));
        const totalPages = Math.ceil(merged.length / RECORDS_PER_PAGE);
        const startIndex = (page - 1) * RECORDS_PER_PAGE;
        const endIndex = startIndex + RECORDS_PER_PAGE;
        const paginatedEvents = merged.slice(startIndex, endIndex);

        setUserEvents(paginatedEvents);
        setUserPagination({
          currentPage: page,
          totalPages,
          totalRecords: merged.length
        });
      }
    } catch (error) {
      console.error("Error cargando eventos de usuarios:", error);
    }
  };

  const loadServiceEvents = async (page = 1) => {
    try {
      let serviceParams = { affected_record_type: "dental_services" };
      if (serviceFilter !== "ALL") serviceParams.event_type = serviceFilter;

      const result = await fetchAuditEventsWithCount(serviceParams, page);

      setServiceEvents(result.events);
      setServicePagination({
        currentPage: page,
        totalPages: result.totalPages,
        totalRecords: result.total
      });
    } catch (error) {
      console.error("Error cargando eventos de servicios:", error);
    }
  };

  const loadPatientEvents = async (page = 1) => {
    try {
      let patientParams = { affected_record_type: "patients" };

      // Aplicar el filtro según el tipo de evento seleccionado
      if (patientFilter !== "ALL") {
        patientParams.event_type = patientFilter;
      }

      const result = await fetchAuditEventsWithCount(patientParams, page);

      setPatientEvents(result.events);
      setPatientPagination({
        currentPage: page,
        totalPages: result.totalPages,
        totalRecords: result.total
      });
    } catch (error) {
      console.error("Error cargando eventos de pacientes:", error);
    }
  };

  const loadGuardianEvents = async (page = 1) => {
    try {
      let guardianParams = { affected_record_type: "guardians" };
      if (guardianFilter !== "ALL") guardianParams.event_type = guardianFilter;

      const result = await fetchAuditEventsWithCount(guardianParams, page);

      setGuardianEvents(result.events);
      setGuardianPagination({
        currentPage: page,
        totalPages: result.totalPages,
        totalRecords: result.total
      });
    } catch (error) {
      console.error("Error cargando eventos de guardianes:", error);
    }
  };

  const loadPersonEvents = async (page = 1) => {
    try {
      let personParams = { affected_record_type: "persons" };
      if (personFilter !== "ALL") personParams.event_type = personFilter;

      const result = await fetchAuditEventsWithCount(personParams, page);

      setPersonEvents(result.events);
      setPersonPagination({
        currentPage: page,
        totalPages: result.totalPages,
        totalRecords: result.total
      });
    } catch (error) {
      console.error("Error cargando eventos de personas:", error);
    }
  };

  const loadHistoryEvents = async (page = 1) => {
    try {
      let historyParams = { affected_record_type: "clinical_histories" };
      if (historyFilter !== "ALL") historyParams.event_type = historyFilter;

      const result = await fetchAuditEventsWithCount(historyParams, page);

      setHistoryEvents(result.events);
      setHistoryPagination({
        currentPage: page,
        totalPages: result.totalPages,
        totalRecords: result.total
      });
    } catch (error) {
      console.error("Error cargando eventos de historias clínicas:", error);
    }
  };

  // Funciones de navegación de páginas
  const goToPage = (page, tab) => {
    if (tab === "login") {
      loadLoginEvents(page);
    } else if (tab === "users") {
      loadUserEvents(page);
    } else if (tab === "patients") {
      loadPatientEvents(page);
    } else if (tab === "guardians") {
      loadGuardianEvents(page);
    } else if (tab === "persons") {
      loadPersonEvents(page);
    } else if (tab === "services") {
      loadServiceEvents(page);
    } else if (tab === "histories") {
      loadHistoryEvents(page);
    }
  };

  const goToPreviousPage = (tab) => {
    const pagination = tab === "login" ? loginPagination :
      tab === "users" ? userPagination :
        tab === "patients" ? patientPagination :
          tab === "guardians" ? guardianPagination :
            tab === "persons" ? personPagination :
              tab === "services" ? servicePagination : historyPagination;
    if (pagination.currentPage > 1) {
      goToPage(pagination.currentPage - 1, tab);
    }
  };

  const goToNextPage = (tab) => {
    const pagination = tab === "login" ? loginPagination :
      tab === "users" ? userPagination :
        tab === "patients" ? patientPagination :
          tab === "guardians" ? guardianPagination :
            tab === "persons" ? personPagination :
              tab === "services" ? servicePagination : historyPagination;
    if (pagination.currentPage < pagination.totalPages) {
      goToPage(pagination.currentPage + 1, tab);
    }
  };

  function getCamposModificados(ev) {
    if (
      ev.event_type !== "UPDATE" ||
      !ev.change_details ||
      !ev.change_details.datos_anteriores ||
      !ev.change_details.datos_nuevos
    ) return null;

    const { datos_anteriores, datos_nuevos } = ev.change_details;
    const campos = [];
    for (const key in datos_nuevos) {
      if (
        key !== "updated_at" &&
        datos_anteriores[key] !== datos_nuevos[key]
      ) {
        campos.push(key);
      }
    }
    return campos.length ? campos.join(", ") : null;
  }

  if (userRole !== "Auditor") return <div className="font-poppins text-center mt-20 text-xl">No autorizado</div>;
  if (loading) return <div className="font-poppins text-center mt-10 text-18">Cargando auditoría...</div>;

  //header de la tabla
  const tableHeaderClass = "bg-header-blue text-white font-semibold text-center font-poppins text-18";
  const tableCellClass = "text-center font-poppins text-18 py-2";
  const wideColumnClass = "w-[155px]";

  return (
    <main className="flex min-h-[calc(100vh-94px)] bg-gray-50 overflow-hidden">
      <aside className="w-60 bg-gray-0 flex flex-col justify-center items-center p-6 border-r border-gray-300 text-18">
        <div className="flex flex-col gap-6 items-center w-full">
          {TABS.map(tab => (
            <Button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                // Reiniciar la paginación del tab activo a la página 1
                if (tab.key === "login") {
                  setLoginPagination(prev => ({ ...prev, currentPage: 1 }));
                } else if (tab.key === "users") {
                  setUserPagination(prev => ({ ...prev, currentPage: 1 }));
                } else if (tab.key === "services") {
                  setServicePagination(prev => ({ ...prev, currentPage: 1 }));
                } else if (tab.key === "histories") {
                  setHistoryPagination(prev => ({ ...prev, currentPage: 1 }));
                }
              }}
              className={`w-full py-3 px-4 rounded-[40px] font-poppins text-18 font-italic shadow-md
                ${activeTab === tab.key
                  ? "bg-primary-blue text-white"
                  : "bg-header-blue text-primary-blue border border-primary-blue hover:bg-primary-blue-hover hover:text-white"}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col items-center justify-center px-3">
        <h1 className="text-header-blue text-46 font-bold font-poppins pt-8 text-center pb-6">
          Auditoría del Sistema
        </h1>

        <div className=" w-full max-w-[900px] flex items-center justify-start  pb-2">
          {activeTab === "login" && (
            <>
              <label className="mr-3 font-poppins text-16 font-semibold">Filtrar por tipo:</label>
              <Select
                value={loginFilter}
                size="small"
                onChange={e => {
                  setLoginFilter(e.target.value);
                  setLoginPagination(prev => ({ ...prev, currentPage: 1 })); // Reiniciar a primera página
                }}
              >
                <option value="ALL">Todos</option>
                <option value="LOGIN_SUCCESS">Ingresos exitosos</option>
                <option value="LOGIN_FAILED">Intentos fallidos</option>
                <option value="LOGOUT">Salidas</option>
                <option value="ACCOUNT_LOCKED">Cuentas bloqueadas</option>
              </Select>
            </>
          )}
          {activeTab === "users" && (
            <>
              <label className="mr-3 font-poppins text-18 font-semibold">Filtrar por tipo:</label>
              <Select
                value={userFilter}
                size="small"
                onChange={e => {
                  setUserFilter(e.target.value);
                  setUserPagination(prev => ({ ...prev, currentPage: 1 })); // Reiniciar a primera página
                }}
              >
                <option value="ALL">Todos</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE">Modificaciones</option>
                {/* <option value="DELETE">Eliminaciones</option> */}
                <option value="DEACTIVATE">Desactivaciones</option>
                <option value="ACTIVATE">Activaciones</option>
              </Select>
            </>
          )}
          {activeTab === "services" && (
            <>
              <label className="mr-3 font-poppins text-18 font-semibold">Filtrar por tipo:</label>
              <Select
                value={serviceFilter}
                size="small"
                onChange={e => {
                  setServiceFilter(e.target.value);
                  setServicePagination(prev => ({ ...prev, currentPage: 1 })); // Reiniciar a primera página
                }}
              >
                <option value="ALL">Todos</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE">Modificaciones</option>
                <option value="REACTIVATE">Activaciones</option>
                <option value="DEACTIVATE">Desactivaciones</option>
              </Select>
            </>
          )}
          {activeTab === "patients" && (
            <>
              <label className="mr-3 font-poppins text-18 font-semibold">Filtrar por tipo:</label>
              <Select
                value={patientFilter}
                size="small"
                onChange={e => {
                  setPatientFilter(e.target.value);
                  setPatientPagination(prev => ({ ...prev, currentPage: 1 })); // Reiniciar a primera página
                }}
              >
                <option value="ALL">Todos</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE">Modificaciones</option>
                {/* <option value="DELETE">Eliminaciones</option> */}
                <option value="REACTIVATE">Activaciones</option>
                <option value="DEACTIVATE">Desactivaciones</option>
              </Select>
            </>
          )}
          {activeTab === "guardians" && (
            <>
              <label className="mr-3 font-poppins text-18 font-semibold">Filtrar por tipo:</label>
              <Select
                value={guardianFilter}
                onChange={e => {
                  setGuardianFilter(e.target.value);
                  setGuardianPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
              // className="w-[250px] h-[35px] rounded-[40px] font-poppins text-16 px-6"
              >
                <option value="ALL">Todos</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE">Modificaciones</option>
                <option value="AUTO_REACTIVATE">Activaciones</option>
                <option value="AUTO_DEACTIVATE">Desactivaciones</option>
              </Select>
            </>
          )}
          {activeTab === "persons" && (
            <>
              <label className="mr-3 font-poppins text-18 font-semibold">Filtrar por tipo:</label>
              <Select
                value={personFilter}
                onChange={e => {
                  setPersonFilter(e.target.value);
                  setPersonPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
              // className="w-[250px] h-[35px] rounded-[40px] font-poppins text-16 px-6"
              >
                <option value="ALL">Todos</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE">Modificaciones</option>
                <option value="DELETE">Eliminaciones</option>
              </Select>
            </>
          )}
          {activeTab === "histories" && (
            <>
              <label className="mr-3 font-poppins text-18 font-semibold">Filtrar por tipo:</label>
              <Select
                value={historyFilter}
                size="small"
                onChange={e => {
                  setHistoryFilter(e.target.value);
                  setHistoryPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
              >
                <option value="ALL">Todos</option>
                <option value="CREACION_HISTORIA_CLINICA">Creaciones</option>
                <option value="UPDATE">Actualizaciones</option>
                <option value="READ">Consultas</option>
                <option value="REACTIVATE">Activaciones</option>
                <option value="DEACTIVATE">Desactivaciones</option>
                {/* <option value="AGREGAR_TRATAMIENTO">Actulizaciones</option> */}
              </Select>
            </>
          )}
        </div>
        <div className="w-full max-w-[900px] bg-white rounded-[12px] shadow-md overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
          {activeTab === "login" && (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 h-10">
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>IP Origen</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loginEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-poppins text-16">
                      No se encontraron eventos de ingreso/salida
                    </td>
                  </tr>
                ) : (
                  loginEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                      <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                      <td className={tableCellClass}>{ev.event_type}</td>
                      <td className={tableCellClass}>{ev.source_ip}</td>
                      <td className={tableCellClass}>{ev.event_description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "users" && (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 h-10">
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Campos modificados</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-poppins text-16">
                      No se encontraron eventos de usuarios
                    </td>
                  </tr>
                ) : (
                  userEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                      <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                      <td className={tableCellClass}>{ev.event_type}</td>
                      <td className={tableCellClass}>
                        {ev.event_type === "UPDATE"
                          ? getCamposModificados(ev) || "-"
                          : "-"}
                      </td>
                      <td className={tableCellClass}>{ev.event_description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "services" && (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 h-10">
                <tr>
                  <th className={`${tableHeaderClass} ${wideColumnClass}`}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Servicio afectado</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {serviceEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-poppins text-16">
                      No se encontraron eventos de servicios odontológicos
                    </td>
                  </tr>
                ) : (
                  serviceEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                      <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                      <td className={tableCellClass}>{ev.event_type}</td>
                      <td className={tableCellClass}>{ev.affected_record_id}</td>
                      <td className={tableCellClass}>{ev.event_description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "patients" && (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 h-10">
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Paciente afectado</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {patientEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-poppins text-16">
                      No se encontraron eventos de pacientes
                    </td>
                  </tr>
                ) : (
                  patientEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                      <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                      <td className={tableCellClass}>{ev.event_type}</td>
                      <td className={tableCellClass}>{ev.affected_record_id}</td>
                      <td className={tableCellClass}>{ev.event_description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "guardians" && (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 h-10">
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Guardián afectado</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {guardianEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-poppins text-16">
                      No se encontraron eventos de guardianes
                    </td>
                  </tr>
                ) : (
                  guardianEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                      <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                      <td className={tableCellClass}>{ev.event_type}</td>
                      <td className={tableCellClass}>{ev.affected_record_id}</td>
                      <td className={tableCellClass}>{ev.event_description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "persons" && (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 h-10">
                <tr>
                  <th className={tableHeaderClass}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Persona afectada</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {personEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-poppins text-16">
                      No se encontraron eventos de personas
                    </td>
                  </tr>
                ) : (
                  personEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                      <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                      <td className={tableCellClass}>{ev.event_type}</td>
                      <td className={tableCellClass}>{ev.affected_record_id}</td>
                      <td className={tableCellClass}>{ev.event_description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "histories" && (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 h-10">
                <tr>
                  <th className={`${tableHeaderClass} ${wideColumnClass}`}>Fecha</th>
                  <th className={tableHeaderClass}>Usuario</th>
                  <th className={tableHeaderClass}>Tipo Evento</th>
                  <th className={tableHeaderClass}>Historia afectada</th>
                  <th className={tableHeaderClass}>Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyEvents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-poppins text-16">
                      No se encontraron eventos de historias clínicas
                    </td>
                  </tr>
                ) : (
                  historyEvents.map(ev => (
                    <tr key={ev.id}>
                      <td className={tableCellClass}>{new Date(ev.event_timestamp_colombia || ev.event_timestamp).toLocaleString()}</td>
                      <td className={tableCellClass}>{ev.user_email || ev.user_id}</td>
                      <td className={tableCellClass}>{ev.event_type}</td>
                      <td className={tableCellClass}>{ev.affected_record_id}</td>
                      <td className={tableCellClass}>{ev.event_description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Controles de paginación - Solo mostrar para el tab activo */}
        {(() => {
          const pagination = activeTab === "login" ? loginPagination :
            activeTab === "users" ? userPagination :
              activeTab === "patients" ? patientPagination :
                activeTab === "guardians" ? guardianPagination :
                  activeTab === "persons" ? personPagination :
                    activeTab === "services" ? servicePagination : historyPagination;

          if (pagination.totalPages <= 1) return null;

          return (
            <div className="w-full max-w-[900px] flex justify-center items-center mt-6 gap-3">
              {/* Botón Primera página (solo si hay más de 5 páginas y no estamos en las primeras) */}
              {pagination.totalPages > 5 && pagination.currentPage > 3 && (
                <button
                  className="group flex items-center justify-center w-10 h-10 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5"
                  onClick={() => goToPage(1, activeTab)}
                  title="Primera página"
                >
                  <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Botón Anterior */}
              <button
                className={`group flex items-center justify-center px-4 py-2 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm ${pagination.currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
                  }`}
                onClick={() => goToPreviousPage(activeTab)}
                disabled={pagination.currentPage === 1}
              >
                <svg
                  className={`w-4 h-4 mr-2 transition-transform duration-200 ${pagination.currentPage === 1 ? '' : 'group-hover:-translate-x-0.5'
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </button>

              {/* Números de página */}
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((pageNumber) => {
                  // Mostrar solo algunas páginas alrededor de la actual
                  if (
                    pageNumber === 1 ||
                    pageNumber === pagination.totalPages ||
                    (pageNumber >= pagination.currentPage - 2 && pageNumber <= pagination.currentPage + 2)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-poppins text-12 font-medium transition-all duration-200 ${pagination.currentPage === pageNumber
                          ? 'bg-primary-blue text-white shadow-lg transform scale-105 border-2 border-primary-blue'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-primary-blue hover:text-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
                          }`}
                        onClick={() => goToPage(pageNumber, activeTab)}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === pagination.currentPage - 3 ||
                    pageNumber === pagination.currentPage + 3
                  ) {
                    return (
                      <div key={pageNumber} className="flex items-center justify-center w-10 h-10">
                        <span className="text-gray-400 font-poppins text-12">•••</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Botón Siguiente */}
              <button
                className={`group flex items-center justify-center px-4 py-2 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm ${pagination.currentPage === pagination.totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5'
                  }`}
                onClick={() => goToNextPage(activeTab)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Siguiente
                <svg
                  className={`w-4 h-4 ml-2 transition-transform duration-200 ${pagination.currentPage === pagination.totalPages ? '' : 'group-hover:translate-x-0.5'
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Botón Última página (solo si hay más de 5 páginas y no estamos en las últimas) */}
              {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 2 && (
                <button
                  className="group flex items-center justify-center w-10 h-10 rounded-full font-poppins text-12 font-medium transition-all duration-200 shadow-sm bg-white text-gray-700 hover:bg-primary-blue hover:text-white border border-gray-300 hover:border-primary-blue hover:shadow-md transform hover:-translate-y-0.5"
                  onClick={() => goToPage(pagination.totalPages, activeTab)}
                  title="Última página"
                >
                  <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          );
        })()}

        {/* Información de paginación */}
        {(() => {
          const pagination = activeTab === "login" ? loginPagination :
            activeTab === "users" ? userPagination :
              activeTab === "patients" ? patientPagination :
                activeTab === "guardians" ? guardianPagination :
                  activeTab === "persons" ? personPagination :
                    activeTab === "services" ? servicePagination : historyPagination;
          const events = activeTab === "login" ? loginEvents :
            activeTab === "users" ? userEvents :
              activeTab === "patients" ? patientEvents :
                activeTab === "guardians" ? guardianEvents :
                  activeTab === "persons" ? personEvents :
                    activeTab === "services" ? serviceEvents : historyEvents;
          const entityName = activeTab === "login" ? "eventos" :
            activeTab === "users" ? "eventos de usuarios" :
              activeTab === "patients" ? "eventos de pacientes" :
                activeTab === "guardians" ? "eventos de guardianes" :
                  activeTab === "persons" ? "eventos de personas" :
                    activeTab === "services" ? "eventos de servicios" : "eventos de historias clínicas";

          if (pagination.totalRecords === 0) return null;

          return (
            <div className="w-full max-w-[900px] flex justify-center mt-3">
              <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                <p className="text-gray-600 font-poppins text-12 font-medium">
                  <span className="text-primary-blue font-semibold">
                    {(pagination.currentPage - 1) * RECORDS_PER_PAGE + 1}
                  </span>
                  {' - '}
                  <span className="text-primary-blue font-semibold">
                    {Math.min(pagination.currentPage * RECORDS_PER_PAGE, pagination.totalRecords)}
                  </span>
                  {' de '}
                  <span className="text-primary-blue font-semibold">
                    {pagination.totalRecords}
                  </span>
                  {' ' + entityName}
                </p>
              </div>
            </div>
          );
        })()}
      </section>
    </main>
  );
}

export default AuditLog;
