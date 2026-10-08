// API de prueba para el agente "Asistente Pedidos Tienda" (Amelia)
// Datos inventados, solo para práctica. Sin base de datos real: todo vive en memoria.

const express = require("express");
const app = express();
app.use(express.json());

// ---- "Base de datos" de prueba ----
const pedidos = {
  "1001": { documento: "12345678", cliente: "Laura Gómez", estado: "En camino", fechaEstimada: "2026-10-12", transportadora: "Servientrega" },
  "1002": { documento: "87654321", cliente: "Carlos Ruiz", estado: "Entregado", fechaEstimada: "2026-10-05", transportadora: "Coordinadora" },
  "1003": { documento: "11223344", cliente: "Marta Pérez", estado: "En proceso", fechaEstimada: "2026-10-15", transportadora: "Pendiente de asignar" }
};

const incidencias = [];
let consecutivo = 9001;

const TIPOS_VALIDOS = ["retraso", "producto_danado", "no_llego"];

// ---- Autenticación sencilla opcional (cabecera x-api-key) ----
// Si defines API_KEY como variable de entorno, se exige en cada llamada.
app.use((req, res, next) => {
  const key = process.env.API_KEY;
  if (key && req.header("x-api-key") !== key) {
    return res.status(401).json({ ok: false, nextAction: "Dile al cliente que en este momento no puedes consultar la información y ofrece transferirlo con un asesor humano." });
  }
  next();
});

// Salud del servicio
app.get("/", (req, res) => res.json({ ok: true, servicio: "api-pedidos-demo" }));

// 1) Consultar pedido (verifica número de pedido + documento)
app.get("/pedidos/:numeroPedido", (req, res) => {
  const { numeroPedido } = req.params;
  const documento = String(req.query.documento || "").trim();
  const pedido = pedidos[numeroPedido];

  if (!documento) {
    return res.status(400).json({
      ok: false,
      verificado: false,
      nextAction: "Pídele amablemente al cliente su número de documento para poder consultar el pedido."
    });
  }

  if (!pedido || pedido.documento !== documento) {
    // Mismo mensaje en ambos casos para no revelar qué pedidos existen
    return res.status(404).json({
      ok: false,
      verificado: false,
      nextAction: "Dile al cliente que no pudiste verificar los datos con el número de pedido y documento que dio. Pídele que los confirme de nuevo. Si falla una segunda vez, ofrece transferirlo con un asesor humano."
    });
  }

  res.json({
    ok: true,
    verificado: true,
    numeroPedido,
    cliente: pedido.cliente,
    estado: pedido.estado,
    fechaEstimada: pedido.fechaEstimada,
    transportadora: pedido.transportadora,
    nextAction: `Informa al cliente que su pedido ${numeroPedido} está "${pedido.estado}", con fecha estimada ${pedido.fechaEstimada} y transportadora ${pedido.transportadora}. Luego pregunta si desea reportar algún problema con la entrega o si necesita algo más.`
  });
});

// 2) Reportar problema con un pedido
app.post("/pedidos/:numeroPedido/incidencias", (req, res) => {
  const { numeroPedido } = req.params;
  const { documento, tipo, descripcion } = req.body || {};
  const pedido = pedidos[numeroPedido];

  if (!pedido || String(documento || "").trim() !== pedido.documento) {
    return res.status(403).json({
      ok: false,
      nextAction: "Dile al cliente que primero necesitas verificar su identidad con el número de pedido y el documento antes de registrar un reclamo."
    });
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({
      ok: false,
      nextAction: "Pregunta al cliente cuál es el problema: retraso en la entrega, producto dañado, o el pedido no llegó. Luego vuelve a intentar con el tipo correcto (retraso, producto_danado o no_llego)."
    });
  }

  const idIncidencia = `INC-${consecutivo++}`;
  incidencias.push({ idIncidencia, numeroPedido, tipo, descripcion: descripcion || "", fecha: new Date().toISOString() });

  res.status(201).json({
    ok: true,
    idIncidencia,
    nextAction: `Confirma al cliente que su reclamo fue registrado con el número ${idIncidencia} y que un asesor lo contactará en un plazo de 24 horas hábiles. Pregunta si necesita algo más.`
  });
});

// (Ayuda para pruebas) Ver incidencias registradas
app.get("/incidencias", (req, res) => res.json(incidencias));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API de pedidos escuchando en el puerto ${PORT}`));
