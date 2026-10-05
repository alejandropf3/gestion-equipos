"use client"; // Este componente corre en el navegador
 
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
 
// Tipos de mantenimiento disponibles
const TIPOS_MANTENIMIENTO = ["Preventivo", "Correctivo", "Formateo", "Cambio de pieza"];
 
export default function RegistrarMantenimiento({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { id } = params;
 
  // --- ESTADOS ---
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
 
  // Datos del formulario de mantenimiento
  const [mantenimiento, setMantenimiento] = useState({
    tipo: "Preventivo",
    descripcion: "",
    tecnico: "",
    fecha_inicio: new Date().toISOString().split("T")[0], // Fecha de hoy
    fecha_fin: "",
  });
 
  // --- CARGA INICIAL ---
  useEffect(() => {
    async function cargarEquipo() {
      const { data } = await supabase
        .from("equipos")
        .select("id, marca, modelo, serial, tipo")
        .eq("id", id)
        .single();
      setEquipo(data);
      setLoading(false);
    }
    cargarEquipo();
  }, [id]);
 
  // --- ACTUALIZAR CAMPOS ---
  function actualizarCampo(e) {
    const { name, value } = e.target;
    setMantenimiento((prev) => ({ ...prev, [name]: value }));
  }
 
  // --- GUARDAR MANTENIMIENTO ---
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
 
    // Validacion de campos obligatorios
    if (!mantenimiento.tipo || !mantenimiento.descripcion || !mantenimiento.tecnico || !mantenimiento.fecha_inicio) {
      setError("Por favor completa todos los campos obligatorios.");
      setGuardando(false);
      return;
    }
 
    // Guardamos el registro de mantenimiento vinculado al equipo
    const { error: errorGuardar } = await supabase
      .from("mantenimientos")
      .insert([{
        equipo_id: id,
        tipo: mantenimiento.tipo,
        descripcion: mantenimiento.descripcion,
        tecnico: mantenimiento.tecnico,
        fecha_inicio: mantenimiento.fecha_inicio,
        fecha_fin: mantenimiento.fecha_fin || null,
      }]);
 
    if (errorGuardar) {
      setError("Error al guardar el mantenimiento: " + errorGuardar.message);
      setGuardando(false);
      return;
    }
 
    // Redirigimos a la inspeccion del equipo en el tab de mantenimiento
    router.push(`/equipos/${id}?tab=mantenimiento`);
  }
 
  if (loading) return <div className="text-center py-20 text-gray-400">Cargando...</div>;
  if (!equipo) return <div className="text-center py-20 text-red-500">Equipo no encontrado.</div>;
 
  return (
    <div className="max-w-2xl mx-auto">
 
      {/* ENCABEZADO */}
      <div className="mb-6">
        <a href={`/equipos/${id}`} className="text-blue-600 hover:underline text-sm">
          ← Volver al equipo
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Registrar mantenimiento</h1>
        <p className="text-gray-500 text-sm mt-1">
          Registra un evento de mantenimiento para este equipo
        </p>
      </div>
 
      {/* RESUMEN DEL EQUIPO */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-orange-500 font-semibold mb-1">Equipo</p>
        <p className="font-bold text-orange-800">{equipo.marca} {equipo.modelo}</p>
        <p className="text-sm text-orange-600 font-mono">{equipo.serial}</p>
      </div>
 
      {/* MENSAJE DE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}
 
      <form onSubmit={guardar} className="space-y-6">
 
        {/* SECCION 1: Informacion del mantenimiento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            🔧 Informacion del mantenimiento
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 
            {/* Tipo de mantenimiento */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de mantenimiento <span className="text-red-500">*</span>
              </label>
              {/* Mostramos los tipos como botones seleccionables para mejor UX */}
              <div className="flex flex-wrap gap-2">
                {TIPOS_MANTENIMIENTO.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setMantenimiento((prev) => ({ ...prev, tipo }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mantenimiento.tipo === tipo
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>
 
            {/* Tecnico responsable */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tecnico responsable <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tecnico"
                value={mantenimiento.tecnico}
                onChange={actualizarCampo}
                placeholder="Nombre del tecnico que realiza el mantenimiento"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
 
            {/* Fecha de inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_inicio"
                value={mantenimiento.fecha_inicio}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
 
            {/* Fecha de fin (opcional si aun no termina) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de fin
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <input
                type="date"
                name="fecha_fin"
                value={mantenimiento.fecha_fin}
                onChange={actualizarCampo}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Deja en blanco si el mantenimiento aun no ha terminado.
              </p>
            </div>
 
            {/* Descripcion del mantenimiento */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripcion <span className="text-red-500">*</span>
              </label>
              <textarea
                name="descripcion"
                value={mantenimiento.descripcion}
                onChange={actualizarCampo}
                placeholder="Describe el trabajo realizado, piezas cambiadas, problemas encontrados, etc..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>
        </div>
 
        {/* BOTONES de accion */}
        <div className="flex gap-3 justify-end pb-8">
          <a href={`/equipos/${id}`}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </a>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Registrar mantenimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}