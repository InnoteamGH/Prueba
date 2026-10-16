export default {
  "sueltos": [
    {
      "cod": 26,
      "nom": "Consulta general",
      "v": 50,
      "amb": "general"
    },
    {
      "cod": 133,
      "nom": "Consulta + profilaxis dental",
      "v": 159,
      "amb": "general"
    },
    {
      "cod": 21,
      "nom": "Radiografía periapical",
      "v": 35,
      "amb": "pieza"
    },
    {
      "cod": 10,
      "nom": "Pernos de fibra de vidrio",
      "v": 450,
      "amb": "pieza"
    },
    {
      "cod": 14,
      "nom": "Corona porcelana sobre zirconio",
      "v": 1600,
      "amb": "pieza"
    },
    {
      "cod": 119,
      "nom": "Blanqueamiento interno por diente",
      "v": 250,
      "amb": "pieza"
    },
    {
      "cod": 242,
      "nom": "Profilaxis dental",
      "v": 159,
      "amb": "maxilar"
    },
    {
      "cod": 202,
      "nom": "Destartraje por maxilar",
      "v": 50,
      "amb": "maxilar",
      "porMax": true
    },
    {
      "cod": 58,
      "nom": "Destartraje superior e inferior",
      "v": 100,
      "amb": "maxilar",
      "fijo": "ambos"
    },
    {
      "cod": 3,
      "nom": "Blanqueamiento láser por sesión",
      "v": 250,
      "amb": "maxilar"
    },
    {
      "cod": 59,
      "nom": "Blanqueamiento láser 3 sesiones",
      "v": 620,
      "amb": "maxilar"
    },
    {
      "cod": 1,
      "nom": "Flúor barniz",
      "v": 80,
      "amb": "maxilar"
    }
  ],
  "reglas": {
    "caries": {
      "cod": 127,
      "nom": "Curación con resina esencial",
      "v": 85,
      "alternativas": [
        [
          4,
          "Curación con resina full",
          200
        ],
        [
          166,
          "Curación resina plus",
          140
        ],
        [
          284,
          "Curación con resina infiltrante",
          260
        ],
        [
          5,
          "Curación con ionómero",
          100
        ]
      ]
    },
    "dde": {
      "cod": 242,
      "nom": "Profilaxis dental",
      "v": 159
    },
    "fractura": {
      "cod": 18,
      "nom": "Exodoncia simple",
      "v": 95,
      "alternativas": [
        [
          19,
          "Exodoncia compleja",
          600
        ]
      ]
    },
    "fractR": {
      "cod": 18,
      "nom": "Exodoncia simple",
      "v": 95
    },
    "rr": {
      "cod": 18,
      "nom": "Exodoncia simple",
      "v": 95,
      "alternativas": [
        [
          19,
          "Exodoncia compleja",
          600
        ]
      ]
    },
    "extraccion": {
      "cod": 18,
      "nom": "Exodoncia simple",
      "v": 95,
      "alternativas": [
        [
          19,
          "Exodoncia compleja",
          600
        ],
        [
          90,
          "Exodoncia semicompleja 3.ª molar",
          500
        ]
      ]
    },
    "coronaT": {
      "cod": 12,
      "nom": "Corona de porcelana sobre metal",
      "v": 850,
      "alternativas": [
        [
          14,
          "Corona porcelana sobre zirconio",
          1600
        ],
        [
          13,
          "Corona de porcelana libre de metal",
          1350
        ]
      ]
    },
    "absceso": {
      "porPieza": true
    },
    "periapic": {
      "porPieza": true
    },
    "endodoncia": {
      "porPieza": true
    },
    "reabs": {
      "sinTratamiento": "Es criterio clínico caso por caso"
    },
    "ausente": {
      "sinTratamiento": "Prótesis o implante: lo define la doctora en consulta"
    },
    "movilidad": {
      "sinTratamiento": "Depende del grado y del diagnóstico periodontal"
    }
  },
  "endodonciaPorPieza": {
    "anterior": {
      "cod": 6,
      "nom": "Endodoncia unirradicular (anteriores)",
      "v": 700
    },
    "premolar": {
      "cod": 7,
      "nom": "Endodoncia birradicular (premolares)",
      "v": 700
    },
    "molar": {
      "cod": 8,
      "nom": "Endodoncia multirradicular (molares)",
      "v": 850
    }
  },
  "maxilares": {
    "sup": "Maxilar superior",
    "inf": "Maxilar inferior",
    "ambos": "Ambos maxilares"
  }
};
