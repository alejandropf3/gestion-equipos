"use client"; // Este componente corre en el navegador
 
// Importamos los hooks necesarios
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
 
export default function InspeccionEquipo({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise); // Desenvolver params que en Next.js 15 es una promesa
  const { id } = params; // ID del equipo obtenido de la URL
 
  // --- ESTADOS ---
  const [equipo, setEquipo] = useState(null);           // Datos del equipo
  const [ingresos, setIngresos] = useState([]);          // Historial de ingresos
  const [salidas, setSalidas] = useState([]);            // Historial de salidas
  const [perifericos, setPerifericos] = useState([]);    // Perifericos vinculados
  const [hostnames, setHostnames] = useState([]);        // Historial de hostnames
  const [mantenimientos, setMantenimientos] = useState([]); // Mantenimientos del equipo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
 
  // Estados para el modal de confirmacion de eliminacion
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [segundos, setSegundos] = useState(10);
  const [puedeEliminar, setPuedeEliminar] = useState(false);
 
  // Tab activo en la inspeccion profunda
  const [tab, setTab] = useState("info"); // "info" | "ingresos" | "salidas" | "mantenimiento"
 
  // --- CARGA DE DATOS ---
  useEffect(() => {
    cargarDatos();
  }, [id]);
 
  async function cargarDatos() {
    setLoading(true);
 
    // Cargamos el equipo principal
    const { data: equipoData, error: errorEquipo } = await supabase
      .from("equipos")
      .select("*")
      .eq("id", id)
      .single();
 
    if (errorEquipo || !equipoData) {
      setError("No se encontro el equipo.");
      setLoading(false);
      return;
    }
 
    // Cargamos el historial de ingresos con sus perifericos
    const { data: ingresosData } = await supabase
      .from("registros_ingreso")
      .select("*, ingreso_perifericos(*)")
      .eq("equipo_id", id)
      .order("created_at", { ascending: false });
 
    // Cargamos el historial de salidas con sus perifericos
    const { data: salidasData } = await supabase
      .from("registros_salida")
      .select("*, salida_perifericos(*)")
      .eq("equipo_id", id)
      .order("created_at", { ascending: false });
 
    // Cargamos los perifericos actualmente vinculados al equipo
    const { data: perifericosData } = await supabase
      .from("perifericos")
      .select("*")
      .eq("equipo_id", id);
 
    // Cargamos el historial de hostnames
    const { data: hostnamesData } = await supabase
      .from("hostname_historial")
      .select("*")
      .eq("equipo_id", id)
      .order("fecha_desde", { ascending: false });
 
    // Cargamos el historial de mantenimientos
    const { data: mantenimientosData } = await supabase
      .from("mantenimientos")
      .select("*")
      .eq("equipo_id", id)
      .order("fecha_inicio", { ascending: false });
 
    setEquipo(equipoData);
    setIngresos(ingresosData || []);
    setSalidas(salidasData || []);
    setPerifericos(perifericosData || []);
    setHostnames(hostnamesData || []);
    setMantenimientos(mantenimientosData || []);
    setLoading(false);
  }
 
  // --- COUNTDOWN PARA ELIMINAR ---
  // Cuando se abre el modal de eliminacion, inicia una cuenta regresiva de 10 segundos
  useEffect(() => {
    if (!mostrarEliminar) return;
 
    // Reiniciamos el contador cada vez que se abre el modal
    setSegundos(10);
    setPuedeEliminar(false);
 
    const intervalo = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(intervalo);
          setPuedeEliminar(true); // Habilita el boton de eliminar
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
 
    // Limpiamos el intervalo si el modal se cierra antes
    return () => clearInterval(intervalo);
  }, [mostrarEliminar]);
 
  // --- ELIMINAR EQUIPO ---
  async function eliminarEquipo() {
    const { error } = await supabase.from("equipos").delete().eq("id", id);
    if (error) {
      setError("Error al eliminar el equipo: " + error.message);
      return;
    }
    router.push("/"); // Redirigimos al listado despues de eliminar
  }
 
  // --- COLORES DE ESTADO ---
  const colorEstado = (estado) => {
    switch (estado) {
      case "En reserva": return "bg-green-100 text-green-700";
      case "Entregado":  return "bg-blue-100 text-blue-700";
      case "Prestado":   return "bg-yellow-100 text-yellow-700";
      default:           return "bg-gray-100 text-gray-700";
    }
  };
 
  // --- FORMATO DE FECHA ---
  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric"
    });
  };
 
  if (loading) return <div className="text-center py-20 text-gray-400">Cargando...</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!equipo) return null;
 
  const esMovil = equipo.tipo === "Celular" || equipo.tipo === "Tablet";
 
  return (
    <div className="max-w-4xl mx-auto">
 
      {/* ENCABEZADO con navegacion y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <a href="/" className="text-blue-600 hover:underline text-sm">
            ← Volver al listado
          </a>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">
            {equipo.marca} {equipo.modelo}
          </h1>
          <p className="text-gray-500 text-sm font-mono mt-1">{equipo.serial}</p>
        </div>
 
        {/* Botones de accion: editar, registrar salida y eliminar */}
        <div className="flex gap-2 flex-wrap">
          <a
            href={`/equipos/${id}/editar`}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ✏️ Editar
          </a>
          <a
            href={`/equipos/${id}/salida`}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            📤 Registrar salida
          </a>
          <button
            onClick={() => setMostrarEliminar(true)}
            className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors"
          >
            🗑 Eliminar
          </button>
        </div>
      </div>
 
      {/* TARJETA DE ESTADO ACTUAL */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${colorEstado(equipo.estado)}`}>
            {equipo.estado}
          </span>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>🖥</span>
            <span>{equipo.hostname_actual || "Sin hostname"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>👤</span>
            <span>{equipo.usuario_actual || "Sin usuario asignado"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📅</span>
            <span>Ingreso: {formatFecha(equipo.fecha_ingreso)}</span>
          </div>
        </div>
      </div>
 
      {/* TABS DE NAVEGACION */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {[
          { key: "info", label: "📋 Informacion" },
          { key: "ingresos", label: "📥 Ingresos" },
          { key: "salidas", label: "📤 Salidas" },
          { key: "mantenimiento", label: "🔧 Mantenimiento" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white shadow-sm text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
 
      {/* TAB: INFORMACION COMPLETA DEL EQUIPO */}
      {tab === "info" && (
        <div className="space-y-6">
 
          {/* Datos generales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Datos del equipo
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Tipo", value: equipo.tipo },
                { label: "Marca", value: equipo.marca },
                { label: "Modelo", value: equipo.modelo },
                { label: "Serial", value: equipo.serial },
                { label: "N° Inventario", value: equipo.numero_inventario || "-" },
                !esMovil && { label: "Hostname", value: equipo.hostname_actual || "-" },
                { label: "Procesador", value: equipo.procesador || "-" },
                { label: "RAM", value: equipo.memoria_ram || "-" },
                { label: "Almacenamiento", value: equipo.almacenamiento || "-" },
                { label: "Sistema Operativo", value: equipo.sistema_operativo || "-" },
                { label: "Licencia Office", value: equipo.licencia_office || "-" },
                { label: "Antivirus", value: equipo.antivirus || "-" },
                esMovil && { label: "Version S.O.", value: equipo.version_so || "-" },
                esMovil && { label: "IMEI 1", value: equipo.imei_1 || "-" },
                esMovil && { label: "IMEI 2", value: equipo.imei_2 || "-" },
              ]
                .filter(Boolean)
                .map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800">{item.value}</p>
                  </div>
                ))}
            </div>
          </div>
 
          {/* Historial de hostnames - solo visible en inspeccion profunda */}
          {!esMovil && hostnames.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                Historial de hostnames
              </h3>
              <div className="space-y-2">
                {hostnames.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                    <span className="font-mono text-gray-800">{h.hostname}</span>
                    <span className="text-gray-400 text-xs">
                      {formatFecha(h.fecha_desde)}
                      {h.fecha_hasta ? ` → ${formatFecha(h.fecha_hasta)}` : " → Actual"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
 
          {/* Perifericos vinculados actualmente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Perifericos vinculados
            </h3>
            {perifericos.length === 0 ? (
              <p className="text-sm text-gray-400">No hay perifericos vinculados actualmente.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {perifericos.map((p) => (
                  <div key={p.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-semibold mb-1">{p.tipo}</p>
                    <p className="text-sm font-medium text-gray-800">{p.marca} {p.modelo || ""}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.serial || "Sin serial"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
 
          {/* Informacion del responsable */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Informacion del responsable
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Nombre", value: equipo.propietario_nombre || "-" },
                { label: "Cedula", value: equipo.propietario_cedula || "-" },
                { label: "Correo", value: equipo.propietario_correo || "-" },
                { label: "Recibido por", value: equipo.recibido_por || "-" },
                { label: "Ciudad", value: equipo.ciudad_recepcion || "-" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
 
      {/* TAB: HISTORIAL DE INGRESOS */}
      {tab === "ingresos" && (
        <div className="space-y-4">
          {ingresos.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📥</p>
              <p>No hay registros de ingreso</p>
            </div>
          ) : (
            ingresos.map((ingreso, index) => (
              <div key={ingreso.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">
                    Ingreso #{ingresos.length - index}
                  </h3>
                  <span className="text-xs text-gray-400">{formatFecha(ingreso.fecha_recepcion)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "Recibido por", value: ingreso.recibido_por },
                    { label: "Ciudad", value: ingreso.ciudad_recepcion },
                    { label: "Hostname", value: ingreso.hostname || "-" },
                    { label: "Responsable", value: ingreso.propietario_nombre || "-" },
                    { label: "Cedula", value: ingreso.propietario_cedula || "-" },
                    { label: "Correo", value: ingreso.propietario_correo || "-" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value || "-"}</p>
                    </div>
                  ))}
                </div>
 
                {/* Perifericos incluidos en este ingreso */}
                {ingreso.ingreso_perifericos?.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Perifericos en este ingreso:</p>
                    <div className="flex flex-wrap gap-2">
                      {ingreso.ingreso_perifericos.map((p) => (
                        <span key={p.id} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                          {p.tipo} - {p.marca} {p.serial ? `(${p.serial})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
 
      {/* TAB: HISTORIAL DE SALIDAS */}
      {tab === "salidas" && (
        <div className="space-y-4">
          {salidas.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📤</p>
              <p>No hay registros de salida</p>
            </div>
          ) : (
            salidas.map((salida, index) => (
              <div key={salida.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">
                    Salida #{salidas.length - index}
                  </h3>
                  <span className="text-xs text-gray-400">{formatFecha(salida.fecha_entrega)}</span>
                </div>
 
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "Usuario", value: salida.usuario_nombre },
                    { label: "Cedula", value: salida.usuario_cedula },
                    { label: "Correo", value: salida.usuario_correo },
                    { label: "Cargo", value: salida.usuario_cargo },
                    { label: "Area", value: salida.usuario_area },
                    { label: "Hostname asignado", value: salida.nuevo_hostname || "-" },
                    { label: "Entregado por", value: salida.entregado_por },
                    { label: "Ciudad", value: salida.ciudad_entrega },
                    { label: "Autorizado por", value: salida.autorizado_por },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value || "-"}</p>
                    </div>
                  ))}
                </div>
 
                {/* Perifericos incluidos en esta salida */}
                {salida.salida_perifericos?.length > 0 && (
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Perifericos en esta salida:</p>
                    <div className="flex flex-wrap gap-2">
                      {salida.salida_perifericos.map((p) => (
                        <span key={p.id} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                          {p.tipo} - {p.marca} {p.serial ? `(${p.serial})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
 
                {/* Documentos generados: acta y carta de autorizacion */}
                <div className="border-t border-gray-100 pt-4 flex gap-3 flex-wrap">
                  {salida.url_acta_entrega ? (
                    <a
                      href={salida.url_acta_entrega}
                      download
                      className="flex items-center gap-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg transition-colors"
                    >
                      ⬇ Descargar acta de entrega
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Sin acta de entrega</span>
                  )}
                  {salida.url_carta_autorizacion ? (
                    <a
                      href={salida.url_carta_autorizacion}
                      download
                      className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg transition-colors"
                    >
                      ⬇ Descargar carta de autorizacion
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 ml-2">Sin carta de autorizacion</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
 
      {/* TAB: MANTENIMIENTO */}
      {tab === "mantenimiento" && (
        <div className="space-y-4">
          <div className="flex justify-end mb-2">
            <a
              href={`/equipos/${id}/mantenimiento`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Registrar mantenimiento
            </a>
          </div>
          {mantenimientos.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">🔧</p>
              <p>No hay registros de mantenimiento</p>
            </div>
          ) : (
            mantenimientos.map((m, index) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                      {m.tipo}
                    </span>
                    <p className="font-semibold text-gray-800 mt-2">Mantenimiento #{mantenimientos.length - index}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatFecha(m.fecha_inicio)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Tecnico", value: m.tecnico },
                    { label: "Fecha inicio", value: formatFecha(m.fecha_inicio) },
                    { label: "Fecha fin", value: formatFecha(m.fecha_fin) },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>
                {m.descripcion && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Descripcion</p>
                    <p className="text-sm text-gray-700">{m.descripcion}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
 
      {/* MODAL DE CONFIRMACION DE ELIMINACION */}
      {mostrarEliminar && (
        // Fondo oscuro detras del modal
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              ¿Eliminar este equipo?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta accion es permanente y eliminara el equipo junto con todo su historial.
              No se puede deshacer.
            </p>
 
            {/* Cuenta regresiva antes de poder eliminar */}
            {!puedeEliminar && (
              <div className="bg-red-50 rounded-lg p-4 mb-4 text-center">
                <p className="text-sm text-red-600">
                  Podras confirmar la eliminacion en{" "}
                  <span className="font-bold text-2xl">{segundos}</span> segundos
                </p>
              </div>
            )}
 
            <div className="flex gap-3 justify-end">
              {/* Boton cancelar: cierra el modal */}
              <button
                onClick={() => setMostrarEliminar(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
 
              {/* Boton eliminar: deshabilitado hasta que pasen los 10 segundos */}
              <button
                onClick={eliminarEquipo}
                disabled={!puedeEliminar}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Eliminar equipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}