export default {
  "empresa": {
    "razonSocial": "ODONTOSONRISA MEDICAL",
    "nombreComercial": "Odonto Sonrisa",
    "ruc": "20612478636",
    "logo": "logo-marca.png",
    "colorPrimario": "#1B1614",
    "web": "odontosonrisa.pe",
    "colorAcento": "#B7AEA2",
    "colorFondoSuave": "#F4F1EA",
    "_paleta": "Negro #1B1614 – Marfil #F4F1EA – Taupe greige #B7AEA2 (manual de marca Odonto Sonrisa)",
    "nombreParaDocumento": "Odonto Sonrisa"
  },
  "sedes": [
    {
      "codigo": "LOS-OLIVOS",
      "nombre": "Los Olivos",
      "direccion": "Av. Antúnez de Mayolo 1094 A, 2do piso — Los Olivos",
      "telefonos": "(01) 233 4998 – 997 091 083",
      "horario": "Lun a vie 9:00–19:00 – sáb 9:00–18:00",
      "correo": "",
      "serieDocumento": "PI"
    }
  ],
  "documento": {
    "tipo": "plan",
    "titulo": "PLAN DE INVERSIÓN",
    "formatoNumero": "{serie}-{anio}-{hc}-{correlativo}",
    "diasVigencia": 30,
    "moneda": "PEN",
    "simboloMoneda": "S/",
    "marcaImporteReferencia": "†",
    "mostrarIndices": false,
    "mostrarOdontograma": true,
    "agruparPorPiezaYTratamiento": true,
    "mostrarUbicacion": false,
    "mostrarSinPrecioEnDocumento": false,
    "descuento": {
      "activo": true,
      "tipo": "porcentaje",
      "valor": 10,
      "etiqueta": "Descuento"
    },
    "mostrarRNE": false
  },
  "textos": {
    "condiciones": [
      [
        "Alcance",
        "Esta propuesta sale de los hallazgos marcados en mal estado en el odontograma del paciente, más los servicios añadidos en recepción. No incluye lo que ya está ejecutado ni las observaciones que no requieren tratamiento."
      ],
      [
        "Vigencia",
        "Válida por {diasVigencia} días contados desde la fecha de emisión."
      ],
      [
        "Variación",
        "Los importes son los del catálogo vigente y pueden variar si al iniciar el tratamiento cambia el diagnóstico."
      ],
      [
        "Aceptación",
        "No constituye un presupuesto aceptado hasta que el paciente firme su conformidad al pie de este documento."
      ],
      [
        "Pago",
        "La forma de pago y las cuotas se acuerdan en recepción y quedan registradas en el estado de cuenta del paciente."
      ],
      [
        "Tratamientos pagados",
        "Los importes pagados por un tratamiento no son objeto de devolución en efectivo. Si el tratamiento no llega a realizarse o el paciente decide cambiarlo, el importe permanece a su favor como saldo en su estado de cuenta y puede aplicarse a cualquier otro tratamiento de la clínica. Esta condición no se aplica cuando el tratamiento no se ejecute por causa atribuible a la clínica y no restringe los derechos que la ley reconoce al paciente."
      ]
    ],
    "notaReferencia": "Importe de referencia.",
    "notaReferenciaCuerpo": "{servicios} todavía no tiene precio confirmado en el catálogo de la clínica; el importe mostrado es referencial y se confirma antes de iniciar.",
    "leyendaSinImporte": "Seis hallazgos quedan fuera de este importe."
  },
  "firma": {
    "profesional": {
      "modo": "manuscrita",
      "imagen": null,
      "certificado": null,
      "fechaHora": null
    },
    "paciente": {
      "modo": "manuscrita",
      "imagen": null,
      "certificado": null,
      "fechaHora": null
    },
    "leyendaManuscrita": "Para firmar a mano",
    "_modos": "manuscrita | electronica | digital | ninguna. Ninguno bloquea la impresión."
  }
};
