"use client"; // Este componente corre en el navegador
 
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
 
export default function ReingresaEquipo({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise); // Desenvolver params que en Next.js 15 es una promesa
  const { id } = params;
 
  // --- ESTADOS ---
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
 
  // Perifericos vinculados al equipo actualmente
  const [perifericosEquipo, setPerifericosEquipo] = useState([]);
 
  // --- DATOS DEL FORMULARIO DE REINGRESO ---
  const [reingreso, setReingreso] = useState({
    recibido_por: "",       // Quien recibe el equipo de vuelta en sistemas
    ciudad_recepcion: "",
    fecha_recepcion: new Date().toISOString().split("T")[0], // Fecha de hoy
    observaciones: "",      // Estado en que regresa el equipo
  });
 
  // --- CARGA INICIAL ---
  useEffect(() => {
    async function cargarDatos() {
      const { data: equipoData } = await supabase
        .from("equipos")
        .select("*")
        .eq("id", id)
        .single();
 
      const { data: perifericosData } = await supabase
        .from("perifericos")
        .select("*")
        .eq("equipo_id", id);
 
      setEquipo(equipoData);
      setPerifericosEquipo(perifericosData || []);
 
      // Si el equipo ya esta en reserva, mostramos advertencia
      if (equipoData?.estado === "En reserva") {
        setError(`Este equipo ya esta en estado "En reserva" y no necesita reingreso.`);
      }
 
      // Prellenamos quien recibe con el responsable actual como sugerencia
      if (equipoData?.recibido_por) {
        setReingreso((prev) => ({ ...prev, recibido_por: equipoData.recibido_por }));
      }
 
      setLoading(false);
    }
    cargarDatos();
  }, [id]);
 
  // --- ACTUALIZAR CAMPOS ---
  function actualizarCampo(e) {
    const { name, value } = e.target;
    setReingreso((prev) => ({ ...prev, [name]: value }));
  }
 
  // --- GUARDAR REINGRESO ---
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
 
    // Verificamos que el equipo haya cargado
    if (!equipo) {
      setError("No se pudo cargar el equipo.");
      setGuardando(false);
      return;
    }
 
    // Bloqueamos si el equipo ya esta en reserva
    if (equipo.estado === "En reserva") {
      setError(`Este equipo ya esta en estado "En reserva" y no necesita reingreso.`);
      setGuardando(false);
      return;
    }
 
    // Validacion de campos obligatorios
    if (!reingreso.recibido_por) {
      setError("Por favor indica quien recibe el equipo.");
      setGuardando(false);
      return;
    }
 
    // 1. Guardamos el registro de reingreso en la tabla registros_ingreso
    // Guardamos quien lo devuelve (usuario anterior) en propietario_nombre
    const { error: errorIngreso } = await supabase
      .from("registros_ingreso")
      .insert([{
        equipo_id: id,
        hostname: equipo.hostname_actual,
        recibido_por: reingreso.recibido_por,
        ciudad_recepcion: reingreso.ciudad_recepcion,
        fecha_recepcion: reingreso.fecha_recepcion,
        // Guardamos el usuario que tenia el equipo como referencia del que lo devuelve
        propietario_nombre: equipo.usuario_actual,
        propietario_cedula: equipo.propietario_cedula,
        propietario_correo: equipo.propietario_correo,
        observaciones: reingreso.observaciones,
      }]);
 
    if (errorIngreso) {
      setError("Error al registrar el reingreso: " + errorIngreso.message);
      setGuardando(false);
      return;
    }
 
    // 2. Actualizamos el estado del equipo a En reserva y limpiamos el usuario actual
    await supabase
      .from("equipos")
      .update({
        estado: "En reserva",
        usuario_actual: null,          // Sin usuario asignado
        propietario_nombre: null,      // Se limpia el responsable
        propietario_cedula: null,
        propietario_correo: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
 
    // 3. Redirigimos a la inspeccion del equipo
    router.push(`/equipos/${id}`);
  }
 
  // --- FORMATO DE FECHA ---
  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const fechaCorregida = fecha.includes("T") ? fecha : fecha + "T00:00:00";
    return new Date(fechaCorregida).toLocaleDateString("es-CO", {
      year: "numeric", month: "long", day: "numeric"
    });
  };
 
  if (loading) return <div className="text-center py-20 text-gray-400">Cargando...</div>;
  if (!equipo) return <div className="text-center py-20 text-red-500">Equipo no encontrado.</div>;
 
  // Verificamos si el equipo puede registrar reingreso
  const puedeReingreso = equipo.estado !== "En reserva";
 
  return (
    <div className="max-w-3xl mx-auto">
 
      {/* ENCABEZADO */}
      <div className="mb-6">
        <a href={`/equipos/${id}`} className="text-blue-600 hover:underline text-sm">
          ← Volver al equipo
        </a>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Registrar reingreso</h1>
        <p className="text-gray-500 text-sm mt-1">
          Registra la devolucion del equipo al inventario
        </p>
      </div>
 
      {/* RESUMEN DEL EQUIPO */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-blue-500 font-semibold mb-1">Equipo que regresa</p>
        <p className="font-bold text-blue-800">{equipo.marca} {equipo.modelo}</p>
        <p className="text-sm text-blue-600 font-mono">{equipo.serial}</p>
        <div className="flex gap-4 mt-2">
          {equipo.hostname_actual && (
            <p className="text-sm text-blue-600">Hostname: {equipo.hostname_actual}</p>
          )}
          {/* Mostramos quien tenia el equipo antes de devolverlo */}
          {equipo.usuario_actual && (
            <p className="text-sm text-blue-600">Devuelto por: <strong>{equipo.usuario_actual}</strong></p>
          )}
        </div>
      </div>
 
      {/* MENSAJE DE ERROR O BLOQUEO */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}
 
      {/* Si el equipo ya esta en reserva, mostramos bloqueo */}
      {!puedeReingreso ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-gray-700 mb-2">El equipo ya esta en inventario</p>
          <p className="text-sm text-gray-500 mb-4">
            Este equipo ya esta en estado <strong>En reserva</strong> y no necesita reingreso.
          </p>
          <a href={`/equipos/${id}`}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Volver al equipo
          </a>
        </div>
      ) : (
        <form onSubmit={guardar} className="space-y-6">
 
          {/* SECCION 1: Informacion de recepcion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              📦 Informacion de recepcion
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recibido por <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="recibido_por"
                  value={reingreso.recibido_por}
                  onChange={actualizarCampo}
                  placeholder="Nombre de quien recibe en sistemas"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  name="ciudad_recepcion"
                  value={reingreso.ciudad_recepcion}
                  onChange={actualizarCampo}
                  placeholder="Ciudad de ubicacion"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de recepcion</label>
                <input
                  type="date"
                  name="fecha_recepcion"
                  value={reingreso.fecha_recepcion}
                  onChange={actualizarCampo}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
 
          {/* SECCION 2: Estado del equipo al regresar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              📝 Estado del equipo al regresar
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                name="observaciones"
                value={reingreso.observaciones}
                onChange={actualizarCampo}
                placeholder="Describe el estado en que regresa el equipo, si tiene daños, piezas faltantes, etc..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
 
          {/* SECCION 3: Perifericos que regresan */}
          {perifericosEquipo.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                🖱 Perifericos vinculados al equipo
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                Estos perifericos estaban vinculados al equipo al momento de la entrega:
              </p>
              <div className="flex flex-wrap gap-2">
                {perifericosEquipo.map((p) => (
                  <span key={p.id} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full">
                    {p.tipo} - {p.marca} {p.serial ? `(${p.serial})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
 
          {/* RESUMEN de lo que pasara al confirmar */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-yellow-800 mb-2">Al confirmar el reingreso:</p>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>✅ El estado del equipo cambiara a <strong>En reserva</strong></li>
              <li>✅ Se registrara la devolucion de <strong>{equipo.usuario_actual || "usuario anterior"}</strong></li>
              <li>✅ El campo de usuario actual quedara como <strong>Sin usuario</strong></li>
              <li>✅ El equipo quedara disponible para una nueva salida</li>
            </ul>
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
              className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {guardando ? "Registrando..." : "Confirmar reingreso"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}