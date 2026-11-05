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
 
  // IDs de los perifericos vinculados que NO regresan con el equipo
  // Por defecto todos regresan; solo se marcan los que faltan
  const [noRegresa, setNoRegresa] = useState([]);
 
  // Avisos si el reingreso se registro pero algun paso final fallo
  // Evita que el usuario vuelva a confirmar y duplique el registro
  const [avisosPostGuardado, setAvisosPostGuardado] = useState([]);
 
  // --- DATOS DEL FORMULARIO DE REINGRESO ---
  const [reingreso, setReingreso] = useState({
    recibido_por: "",
    ciudad_recepcion: "",
    fecha_recepcion: new Date().toISOString().split("T")[0],
    observaciones: "",
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
 
      if (equipoData?.estado === "En reserva") {
        setError(`Este equipo ya esta en estado "En reserva" y no necesita reingreso.`);
      }
 
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
 
  // --- MARCAR / DESMARCAR "NO REGRESO" ---
  // Solo cambia el estado local, no toca la base de datos hasta confirmar el reingreso
  function alternarNoRegresa(perifericoId) {
    setNoRegresa((prev) =>
      prev.includes(perifericoId)
        ? prev.filter((x) => x !== perifericoId)
        : [...prev, perifericoId]
    );
  }
 
  // --- GUARDAR REINGRESO ---
  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");
 
    if (!equipo) {
      setError("No se pudo cargar el equipo.");
      setGuardando(false);
      return;
    }
 
    if (equipo.estado === "En reserva") {
      setError(`Este equipo ya esta en estado "En reserva" y no necesita reingreso.`);
      setGuardando(false);
      return;
    }
 
    if (!reingreso.recibido_por) {
      setError("Por favor indica quien recibe el equipo.");
      setGuardando(false);
      return;
    }
 
    // 1. Guardamos el registro de reingreso en registros_ingreso
    const { data: ingresoGuardado, error: errorIngreso } = await supabase
      .from("registros_ingreso")
      .insert([{
        equipo_id: id,
        hostname: equipo.hostname_actual,
        recibido_por: reingreso.recibido_por,
        ciudad_recepcion: reingreso.ciudad_recepcion,
        fecha_recepcion: reingreso.fecha_recepcion,
        // Guardamos quien devuelve el equipo (usuario que lo tenia)
        propietario_nombre: equipo.usuario_actual,
        propietario_cedula: equipo.propietario_cedula,
        propietario_correo: equipo.propietario_correo,
        observaciones: reingreso.observaciones,
      }])
      .select()
      .single();
 
    if (errorIngreso) {
      setError("Error al registrar el reingreso: " + errorIngreso.message);
      setGuardando(false);
      return;
    }
 
    // A partir de aqui el reingreso YA esta registrado.
    // Si un paso siguiente falla, se guarda como aviso en lugar de abortar,
    // para que el usuario sepa que quedo pendiente y no duplique el registro
    const avisos = [];
 
    // Separamos los perifericos vinculados: los que regresan y los que no
    const regresan = perifericosEquipo.filter((p) => !noRegresa.includes(p.id));
    const faltantes = perifericosEquipo.filter((p) => noRegresa.includes(p.id));
 
    // 2. Guardamos los perifericos con los que regresa el equipo en este ingreso
    // (antes este paso no existia, por eso el historial del reingreso quedaba vacio)
    if (regresan.length > 0) {
      const { error: errorPerifericos } = await supabase
        .from("ingreso_perifericos")
        .insert(
          regresan.map((p) => ({
            ingreso_id: ingresoGuardado.id,
            periferico_id: p.id,
            tipo: p.tipo,
            marca: p.marca,
            modelo: p.modelo,
            serial: p.serial,
          }))
        );
      if (errorPerifericos) {
        avisos.push("No se pudo guardar la lista de perifericos que regresan: " + errorPerifericos.message);
      }
    }
 
    // 3. Actualizamos el estado del equipo a En reserva y limpiamos el usuario actual
    // Guardamos en ultimo_usuario quien era el responsable antes de limpiar
    // Esto permite que la proxima salida sepa quien fue el ultimo usuario
    const { error: errorEquipo } = await supabase
      .from("equipos")
      .update({
        estado: "En reserva",
        usuario_actual: null,
        propietario_nombre: null,
        propietario_cedula: null,
        propietario_correo: null,
        ultimo_usuario: equipo.usuario_actual, // Guardamos el ultimo usuario antes de limpiar
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
 
    if (errorEquipo) {
      avisos.push("No se pudo actualizar el estado del equipo a En reserva: " + errorEquipo.message);
    }
 
    // 4. Desvinculamos los perifericos que no regresaron
    // Dejan de estar asociados al equipo y quedan registrados en su historial
    if (faltantes.length > 0) {
      const idsFaltantes = faltantes.map((p) => p.id);
 
      const { error: errorDesvincular } = await supabase
        .from("perifericos")
        .update({ equipo_id: null })
        .in("id", idsFaltantes);
 
      if (errorDesvincular) {
        avisos.push("No se pudieron desvincular los perifericos que no regresaron: " + errorDesvincular.message);
      } else {
        const { error: errorHistorial } = await supabase
          .from("periferico_historial")
          .insert(
            idsFaltantes.map((perifericoId) => ({
              periferico_id: perifericoId,
              equipo_id: null,
              fecha_desde: new Date().toISOString(),
              motivo: "Desvinculacion en reingreso",
            }))
          );
        if (errorHistorial) {
          avisos.push("Los perifericos se desvincularon, pero no se pudo guardar el historial: " + errorHistorial.message);
        }
      }
    }
 
    // 5. Si todo salio bien volvemos al equipo; si no, mostramos que quedo pendiente
    if (avisos.length === 0) {
      router.push(`/equipos/${id}`);
    } else {
      setAvisosPostGuardado(avisos);
      setGuardando(false);
    }
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
 
  // Si el reingreso se registro pero algun paso final fallo, reemplazamos el formulario por este aviso
  // Asi el usuario no vuelve a registrar el mismo reingreso por error
  if (avisosPostGuardado.length > 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6">
          <p className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ El reingreso se registro, pero quedaron pasos pendientes
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            El registro del reingreso ya se guardo. No vuelvas a registrarlo.
            Revisa lo siguiente en el equipo:
          </p>
          <ul className="text-sm text-yellow-800 space-y-2 mb-6 list-disc pl-5">
            {avisosPostGuardado.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
          <a href={`/equipos/${id}`}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Ir al equipo
          </a>
        </div>
      </div>
    );
  }
 
  const puedeReingreso = equipo.estado !== "En reserva";
  const cantidadRegresan = perifericosEquipo.length - noRegresa.length;
 
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
          {equipo.usuario_actual && (
            <p className="text-sm text-blue-600">
              Devuelto por: <strong>{equipo.usuario_actual}</strong>
            </p>
          )}
        </div>
      </div>
 
      {/* MENSAJE DE ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}
 
      {/* BLOQUEO SI EL EQUIPO YA ESTA EN RESERVA */}
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
 
          {/* SECCION 3: Perifericos que regresan con el equipo */}
          {perifericosEquipo.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                🖱 Perifericos que regresan con el equipo
              </h2>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {cantidadRegresan} de {perifericosEquipo.length} regresan:
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Todos se consideran devueltos. Marca "No regreso" en los que falten; se desvincularan del equipo al confirmar.
              </p>
              <div className="space-y-2">
                {perifericosEquipo.map((p) => {
                  const falta = noRegresa.includes(p.id);
                  return (
                    <div key={p.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 border transition-colors ${
                        falta ? "bg-red-50 border-red-200" : "bg-purple-50 border-purple-200"
                      }`}>
                      <div className={falta ? "opacity-60" : ""}>
                        <span className={`text-xs font-semibold ${falta ? "text-red-600" : "text-purple-600"}`}>
                          {p.tipo}
                        </span>
                        {/* Tachado cuando esta marcado como "No regreso" */}
                        <p className={`text-sm ${falta ? "text-red-800 line-through" : "text-purple-800"}`}>
                          {p.marca} {p.modelo || ""} {p.serial ? `(${p.serial})` : ""}
                        </p>
                      </div>
                      <button type="button" onClick={() => alternarNoRegresa(p.id)}
                        className={`text-xs font-medium ml-3 whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors ${
                          falta
                            ? "bg-white border border-red-300 text-red-600 hover:bg-red-100"
                            : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}>
                        {falta ? "↩ Deshacer" : "No regreso"}
                      </button>
                    </div>
                  );
                })}
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
              {perifericosEquipo.length > 0 && (
                <li>✅ Se guardaran en el historial de este ingreso los <strong>{cantidadRegresan}</strong> perifericos que regresan</li>
              )}
              <li>✅ El equipo quedara disponible para una nueva salida</li>
            </ul>
          </div>
 
          {/* BOTONES */}
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