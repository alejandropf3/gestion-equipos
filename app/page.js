"use client"; // Indica que este componente se ejecuta en el navegador, no en el servidor
 
// Importamos los hooks de React que necesitamos:
// useEffect: para ejecutar codigo cuando la pagina carga
// useState: para guardar y actualizar datos en la pagina
import { useEffect, useState } from "react";
 
// Importamos el cliente de Supabase que configuramos en lib/supabase.js
// Lo usamos para leer y escribir datos en la base de datos
import { supabase } from "@/lib/supabase";
 
// Opciones fijas para los filtros de estado y orden
// Estas aparecen en los selectores de la barra de filtros
const ESTADOS = ["Todos", "En reserva", "Entregado", "Prestado"];
const ORDEN = ["Mas reciente", "Mas antiguo"];
 
// Componente principal de la pagina de inicio
export default function Home() {
 
  // --- ESTADOS (variables que la pagina usa para guardar datos) ---
 
  const [equipos, setEquipos] = useState([]);         // Lista de equipos traidos de Supabase
  const [perifericos, setPerifericos] = useState([]); // Lista de perifericos traidos de Supabase
  const [loading, setLoading] = useState(true);       // Controla si se muestra el mensaje "Cargando..."
  const [busqueda, setBusqueda] = useState("");        // Texto que el usuario escribe en el buscador
  const [estadoFiltro, setEstadoFiltro] = useState("Todos"); // Estado seleccionado en el filtro
  const [orden, setOrden] = useState("Mas reciente");  // Orden seleccionado (reciente o antiguo)
  const [verPerifericos, setVerPerifericos] = useState(false); // Controla si se muestran perifericos o equipos
  const [total, setTotal] = useState(0);              // Total de equipos registrados (para el contador)
 
  // --- CARGA INICIAL DE DATOS ---
 
  // useEffect se ejecuta automaticamente cuando la pagina carga por primera vez
  useEffect(() => {
    cargarDatos();
  }, []); // El [] significa que solo se ejecuta una vez al cargar
 
  // Funcion que trae los equipos y perifericos desde Supabase
  async function cargarDatos() {
    setLoading(true); // Muestra el mensaje "Cargando..."
 
    // Trae todos los equipos ordenados del mas reciente al mas antiguo
    const { data: equiposData } = await supabase
      .from("equipos")
      .select("*")
      .order("created_at", { ascending: false });
 
    // Trae todos los perifericos e incluye datos del equipo vinculado
    // El select con "equipos(...)" hace un JOIN automatico con la tabla equipos
    const { data: perifericosData } = await supabase
      .from("perifericos")
      .select("*, equipos(hostname_actual, serial, usuario_actual)");
 
    // Guardamos los datos en los estados para que la pagina los muestre
    setEquipos(equiposData || []);
    setPerifericos(perifericosData || []);
    setTotal(equiposData?.length || 0);
    setLoading(false); // Oculta el mensaje "Cargando..."
  }
 
  // --- EXPORTACION A EXCEL ---
 
  // Funcion que genera y descarga un archivo Excel con el listado de equipos
  async function exportarExcel() {
    // Importamos SheetJS de forma dinamica (solo cuando se necesita)
    const { utils, writeFile } = await import("xlsx");
 
    // Transformamos los datos de equipos al formato que va en el Excel
    const datos = equiposFiltrados.map((e) => ({
      Serial: e.serial,
      Tipo: e.tipo,
      Marca: e.marca,
      Modelo: e.modelo,
      Hostname: e.hostname_actual || "-",
      Estado: e.estado,
      "Usuario actual": e.usuario_actual || "-",
      "Sistema Operativo": e.sistema_operativo || "-",
      Procesador: e.procesador || "-",
      RAM: e.memoria_ram || "-",
      Almacenamiento: e.almacenamiento || "-",
      "Fecha ingreso": new Date(e.fecha_ingreso).toLocaleDateString("es-CO"),
    }));
 
    // Creamos el archivo Excel y lo descargamos
    const ws = utils.json_to_sheet(datos); // Convierte el array a una hoja de calculo
    const wb = utils.book_new();           // Crea un libro de Excel nuevo
    utils.book_append_sheet(wb, ws, "Equipos"); // Agrega la hoja al libro
    writeFile(wb, "listado_equipos.xlsx"); // Descarga el archivo
  }
 
  // --- FILTRADO Y ORDENAMIENTO ---
 
  // Esta variable aplica los filtros y el orden a la lista de equipos
  // Se recalcula automaticamente cada vez que cambia busqueda, estadoFiltro u orden
  const equiposFiltrados = equipos
    .filter((e) => {
      const texto = busqueda.toLowerCase(); // Convierte la busqueda a minusculas para comparar sin importar mayusculas
 
      // Verifica si el texto de busqueda aparece en alguno de estos campos
      const coincide =
        e.serial?.toLowerCase().includes(texto) ||
        e.hostname_actual?.toLowerCase().includes(texto) ||
        e.marca?.toLowerCase().includes(texto) ||
        e.modelo?.toLowerCase().includes(texto) ||
        e.usuario_actual?.toLowerCase().includes(texto) ||
        e.tipo?.toLowerCase().includes(texto);
 
      // Verifica si el estado del equipo coincide con el filtro seleccionado
      const estadoOk = estadoFiltro === "Todos" || e.estado === estadoFiltro;
 
      return coincide && estadoOk; // El equipo aparece solo si cumple ambas condiciones
    })
    .sort((a, b) => {
      // Ordena por fecha segun la opcion seleccionada
      if (orden === "Mas reciente")
        return new Date(b.created_at) - new Date(a.created_at);
      return new Date(a.created_at) - new Date(b.created_at);
    });
 
  // --- FUNCION DE COLORES PARA EL ESTADO ---
 
  // Devuelve las clases de Tailwind segun el estado del equipo
  // Esto le da un color diferente a cada badge de estado
  const colorEstado = (estado) => {
    switch (estado) {
      case "En reserva": return "bg-green-100 text-green-700";
      case "Entregado":  return "bg-blue-100 text-blue-700";
      case "Prestado":   return "bg-yellow-100 text-yellow-700";
      default:           return "bg-gray-100 text-gray-700";
    }
  };
 
  // --- INTERFAZ DE USUARIO (lo que se muestra en pantalla) ---
 
  return (
    <div>
 
      {/* ENCABEZADO: titulo, contador de equipos y boton de exportar Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Inventario de Equipos
          </h1>
          {/* Muestra el total de equipos registrados */}
          <p className="text-gray-500 text-sm mt-1">
            {total} equipo{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Boton que llama a la funcion exportarExcel al hacer clic */}
        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          ⬇ Exportar Excel
        </button>
      </div>
 
      {/* BARRA DE FILTROS: buscador, selector de estado, orden y boton de perifericos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
 
          {/* Campo de texto para buscar equipos */}
          <input
            type="text"
            placeholder="Buscar por serial, hostname, marca, usuario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} // Actualiza el estado busqueda al escribir
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
 
          {/* Selector para filtrar por estado del equipo */}
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ESTADOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
 
          {/* Selector para elegir el orden de los equipos */}
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ORDEN.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
 
          {/* Boton que alterna entre ver equipos y ver perifericos */}
          <button
            onClick={() => setVerPerifericos(!verPerifericos)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              verPerifericos
                ? "bg-blue-600 text-white"       // Azul cuando esta activo
                : "bg-gray-100 text-gray-700 hover:bg-gray-200" // Gris cuando esta inactivo
            }`}
          >
            🖱 Perifericos
          </button>
        </div>
      </div>
 
      {/* CONTENIDO PRINCIPAL: muestra equipos o perifericos segun el estado verPerifericos */}
      {loading ? (
        // Mensaje de carga mientras se traen los datos de Supabase
        <div className="text-center py-20 text-gray-400">Cargando...</div>
 
      ) : !verPerifericos ? (
        // --- VISTA DE EQUIPOS ---
        equiposFiltrados.length === 0 ? (
          // Mensaje cuando no hay equipos que coincidan con los filtros
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">💻</p>
            <p className="font-medium">No se encontraron equipos</p>
            <p className="text-sm mt-1">Intenta con otros filtros o agrega un nuevo equipo</p>
          </div>
        ) : (
          // Grilla de tarjetas de equipos
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {equiposFiltrados.map((equipo) => (
              // Cada tarjeta es un enlace a la inspeccion profunda del equipo
              <a
                key={equipo.id}
                href={`/equipos/${equipo.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all"
              >
                {/* Fila superior: badge de estado y tipo de equipo */}
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colorEstado(equipo.estado)}`}>
                    {equipo.estado}
                  </span>
                  <span className="text-xs text-gray-400">{equipo.tipo}</span>
                </div>
 
                {/* Nombre del equipo y serial */}
                <div className="mb-1">
                  <p className="font-bold text-gray-800 text-lg leading-tight">
                    {equipo.marca} {equipo.modelo}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{equipo.serial}</p>
                </div>
 
                {/* Hostname y usuario actual */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🖥</span>
                    <span>{equipo.hostname_actual || "Sin hostname"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>👤</span>
                    <span>{equipo.usuario_actual || "Sin usuario"}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )
      ) : (
        // --- VISTA DE PERIFERICOS ---
        perifericos.length === 0 ? (
          // Mensaje cuando no hay perifericos registrados
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🖱</p>
            <p className="font-medium">No hay perifericos registrados</p>
          </div>
        ) : (
          // Grilla de tarjetas de perifericos
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perifericos.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                {/* Badge con el tipo de periferico */}
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                    {p.tipo}
                  </span>
                </div>
 
                {/* Nombre y serial del periferico */}
                <p className="font-bold text-gray-800">{p.marca} {p.modelo || ""}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">{p.serial || "Sin serial"}</p>
 
                {/* Equipo y usuario al que esta vinculado el periferico */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🖥</span>
                    <span>{p.equipos?.hostname_actual || "Sin equipo vinculado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>👤</span>
                    <span>{p.equipos?.usuario_actual || "-"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}