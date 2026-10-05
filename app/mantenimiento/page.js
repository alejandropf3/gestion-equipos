"use client"; // Este componente corre en el navegador
 
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
 
// Tipos de mantenimiento para el filtro
const TIPOS = ["Todos", "Preventivo", "Correctivo", "Formateo", "Cambio de pieza"];
 
export default function BitacoraMantenimiento() {
 
  // --- ESTADOS ---
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [orden, setOrden] = useState("Mas reciente");
 
  // --- CARGA DE DATOS ---
  useEffect(() => {
    async function cargarMantenimientos() {
      // Traemos todos los mantenimientos con los datos del equipo relacionado
      // El select con "equipos(...)" hace un JOIN con la tabla equipos
      const { data } = await supabase
        .from("mantenimientos")
        .select("*, equipos(id, marca, modelo, serial, tipo)")
        .order("fecha_inicio", { ascending: false });
 
      setMantenimientos(data || []);
      setLoading(false);
    }
    cargarMantenimientos();
  }, []);
 
  // --- FORMATO DE FECHA ---
  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const fechaCorregida = fecha.includes("T") ? fecha : fecha + "T00:00:00";
    return new Date(fechaCorregida).toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric"
    });
  };
 
  // --- COLOR POR TIPO DE MANTENIMIENTO ---
  const colorTipo = (tipo) => {
    switch (tipo) {
      case "Preventivo":     return "bg-green-100 text-green-700";
      case "Correctivo":     return "bg-red-100 text-red-700";
      case "Formateo":       return "bg-blue-100 text-blue-700";
      case "Cambio de pieza": return "bg-purple-100 text-purple-700";
      default:               return "bg-gray-100 text-gray-700";
    }
  };
 
  // --- FILTRADO Y ORDENAMIENTO ---
  const mantenimientosFiltrados = mantenimientos
    .filter((m) => {
      const texto = busqueda.toLowerCase();
 
      // Buscamos en los datos del mantenimiento y del equipo relacionado
      const coincide =
        m.tecnico?.toLowerCase().includes(texto) ||
        m.descripcion?.toLowerCase().includes(texto) ||
        m.equipos?.marca?.toLowerCase().includes(texto) ||
        m.equipos?.modelo?.toLowerCase().includes(texto) ||
        m.equipos?.serial?.toLowerCase().includes(texto);
 
      // Filtramos por tipo si no es "Todos"
      const tipoOk = tipoFiltro === "Todos" || m.tipo === tipoFiltro;
 
      return coincide && tipoOk;
    })
    .sort((a, b) => {
      if (orden === "Mas reciente")
        return new Date(b.fecha_inicio) - new Date(a.fecha_inicio);
      return new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
    });
 
  return (
    <div>
 
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bitacora de mantenimiento</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mantenimientos.length} registro{mantenimientos.length !== 1 ? "s" : ""} en total
          </p>
        </div>
      </div>
 
      {/* FILTROS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
 
          {/* Buscador por tecnico, descripcion o equipo */}
          <input
            type="text"
            placeholder="Buscar por tecnico, equipo, descripcion..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
 
          {/* Filtro por tipo de mantenimiento */}
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
 
          {/* Orden por fecha */}
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option>Mas reciente</option>
            <option>Mas antiguo</option>
          </select>
        </div>
      </div>
 
      {/* LISTADO DE MANTENIMIENTOS */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : mantenimientosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🔧</p>
          <p className="font-medium">No se encontraron registros de mantenimiento</p>
          <p className="text-sm mt-1">Intenta con otros filtros</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mantenimientosFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Badge del tipo de mantenimiento */}
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colorTipo(m.tipo)}`}>
                    {m.tipo}
                  </span>
                  {/* Enlace al equipo relacionado */}
                  {m.equipos && (
                    <a
                      href={`/equipos/${m.equipos.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {m.equipos.marca} {m.equipos.modelo}
                      <span className="text-gray-400 font-mono text-xs ml-2">
                        ({m.equipos.serial})
                      </span>
                    </a>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatFecha(m.fecha_inicio)}
                </span>
              </div>
 
              {/* Datos del mantenimiento */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Tecnico</p>
                  <p className="text-sm font-medium text-gray-800">{m.tecnico}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Fecha inicio</p>
                  <p className="text-sm font-medium text-gray-800">{formatFecha(m.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Fecha fin</p>
                  <p className="text-sm font-medium text-gray-800">
                    {m.fecha_fin ? formatFecha(m.fecha_fin) : (
                      <span className="text-orange-500">En proceso</span>
                    )}
                  </p>
                </div>
              </div>
 
              {/* Descripcion del mantenimiento */}
              {m.descripcion && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 mb-1">Descripcion</p>
                  <p className="text-sm text-gray-700">{m.descripcion}</p>
                </div>
              )}
 
              {/* Enlace para ver el equipo completo */}
              {m.equipos && (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <a
                    href={`/equipos/${m.equipos.id}?tab=mantenimiento`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver historial completo del equipo →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}