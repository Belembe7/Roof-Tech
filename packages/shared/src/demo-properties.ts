export type PropertyType = 'Apartamento' | 'Moradia' | 'Quarto' | 'Dependência'

export type DemoProperty = {
  id: string
  slug: string
  reference: string
  title: string
  type: PropertyType
  neighborhood: string
  monthlyRent: number
  bedrooms: number
  bathrooms: number
  parkingSpaces: number
  areaM2: number
  water: boolean
  security: boolean
  available: boolean
  description: string
  features: string[]
  advertiser: { name: string; kind: 'Proprietário' | 'Agente imobiliário' }
  costs: { deposit?: number; otherInitial?: number; visitFee?: number }
  images: { src: string; alt: string }[]
}

const photo = (id: string, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`

export const demoProperties: DemoProperty[] = [
  {
    id: 'RT-D-0241',
    slug: 'apartamento-luminoso-polana',
    reference: 'RT-D-0241',
    title: 'Apartamento luminoso com varanda',
    type: 'Apartamento',
    neighborhood: 'Polana',
    monthlyRent: 48000,
    bedrooms: 2,
    bathrooms: 1,
    parkingSpaces: 1,
    areaM2: 94,
    water: true,
    security: true,
    available: true,
    description:
      'Um exemplo de anúncio residencial com sala ampla, luz natural e uma varanda para momentos tranquilos. A localização indicada é aproximada e serve apenas para demonstrar a experiência de pesquisa.',
    features: [
      'Varanda',
      'Sala com luz natural',
      'Cozinha equipada',
      'Água canalizada',
      'Segurança no edifício',
    ],
    advertiser: { name: 'Anunciante de demonstração A', kind: 'Proprietário' },
    costs: { deposit: 48000, otherInitial: 0, visitFee: 0 },
    images: [
      {
        src: photo('photo-1600607687939-ce8a6c25118c'),
        alt: 'Sala ampla de apartamento, imagem ilustrativa',
      },
      {
        src: photo('photo-1600566753086-00f18fb6b3ea'),
        alt: 'Interior residencial com acabamentos claros, imagem ilustrativa',
      },
      {
        src: photo('photo-1600607687920-4e2a09cf159d'),
        alt: 'Sala de estar contemporânea, imagem ilustrativa',
      },
      {
        src: photo('photo-1600210492486-724fe5c67fb0'),
        alt: 'Sala de estar com mobiliário neutro, imagem ilustrativa',
      },
    ],
  },
  {
    id: 'RT-D-0242',
    slug: 'moradia-familiar-sommerschield',
    reference: 'RT-D-0242',
    title: 'Moradia familiar com pátio',
    type: 'Moradia',
    neighborhood: 'Sommerschield',
    monthlyRent: 85000,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    areaM2: 176,
    water: true,
    security: true,
    available: true,
    description:
      'Exemplo demonstrativo de uma moradia com áreas generosas e espaço exterior. O anúncio e todos os valores são fictícios; confirme sempre os detalhes directamente com um anunciante real.',
    features: [
      'Pátio',
      'Cozinha independente',
      'Água canalizada',
      'Estacionamento para 2 carros',
      'Segurança',
    ],
    advertiser: { name: 'Anunciante de demonstração B', kind: 'Agente imobiliário' },
    costs: { deposit: 85000, otherInitial: 5000, visitFee: 0 },
    images: [
      {
        src: photo('photo-1600585154340-be6161a56a0c'),
        alt: 'Exterior de moradia moderna, imagem ilustrativa',
      },
      {
        src: photo('photo-1600607687939-ce8a6c25118c'),
        alt: 'Sala residencial espaçosa, imagem ilustrativa',
      },
      {
        src: photo('photo-1600566753190-17f0baa2a6c3'),
        alt: 'Cozinha residencial clara, imagem ilustrativa',
      },
    ],
  },
  {
    id: 'RT-D-0243',
    slug: 'quarto-arejado-malhangalene',
    reference: 'RT-D-0243',
    title: 'Quarto arejado em casa partilhada',
    type: 'Quarto',
    neighborhood: 'Malhangalene',
    monthlyRent: 12500,
    bedrooms: 1,
    bathrooms: 1,
    parkingSpaces: 0,
    areaM2: 22,
    water: true,
    security: false,
    available: true,
    description:
      'Exemplo de quarto para arrendamento numa casa partilhada. As fotografias são ilustrativas e não representam um imóvel anunciado na plataforma.',
    features: ['Casa partilhada', 'Casa de banho comum', 'Água canalizada'],
    advertiser: { name: 'Anunciante de demonstração C', kind: 'Proprietário' },
    costs: { deposit: 12500, otherInitial: 0, visitFee: 1000 },
    images: [
      {
        src: photo('photo-1616486338812-3dadae4b4ace'),
        alt: 'Quarto com decoração simples, imagem ilustrativa',
      },
      {
        src: photo('photo-1616594039964-ae9021a400a0'),
        alt: 'Quarto residencial com luz natural, imagem ilustrativa',
      },
    ],
  },
  {
    id: 'RT-D-0244',
    slug: 'dependencia-independente-coop',
    reference: 'RT-D-0244',
    title: 'Dependência independente e funcional',
    type: 'Dependência',
    neighborhood: 'Coop',
    monthlyRent: 18000,
    bedrooms: 1,
    bathrooms: 1,
    parkingSpaces: 1,
    areaM2: 38,
    water: true,
    security: true,
    available: false,
    description:
      'Exemplo de dependência com entrada independente. Este anúncio demonstrativo está marcado como indisponível para ilustrar o estado no produto.',
    features: [
      'Entrada independente',
      'Casa de banho privativa',
      'Água canalizada',
      'Estacionamento',
    ],
    advertiser: { name: 'Anunciante de demonstração D', kind: 'Proprietário' },
    costs: { deposit: 18000, otherInitial: 0 },
    images: [
      {
        src: photo('photo-1600566752355-35792bedcfea'),
        alt: 'Espaço residencial compacto, imagem ilustrativa',
      },
      {
        src: photo('photo-1600607687920-4e2a09cf159d'),
        alt: 'Interior residencial compacto, imagem ilustrativa',
      },
    ],
  },
  {
    id: 'RT-D-0245',
    slug: 'apartamento-confortavel-baixa',
    reference: 'RT-D-0245',
    title: 'Apartamento confortável perto dos serviços',
    type: 'Apartamento',
    neighborhood: 'Baixa',
    monthlyRent: 36000,
    bedrooms: 1,
    bathrooms: 1,
    parkingSpaces: 0,
    areaM2: 61,
    water: false,
    security: true,
    available: true,
    description:
      'Exemplo de apartamento demonstrativo numa zona urbana central. A área e as condições são dados fictícios criados para testar filtros e leitura dos custos.',
    features: ['Sala e cozinha em conceito aberto', 'Segurança no edifício'],
    advertiser: { name: 'Anunciante de demonstração E', kind: 'Agente imobiliário' },
    costs: { deposit: 36000, otherInitial: 2500 },
    images: [
      {
        src: photo('photo-1600607687939-ce8a6c25118c'),
        alt: 'Sala de apartamento com decoração neutra, imagem ilustrativa',
      },
      {
        src: photo('photo-1600566753086-00f18fb6b3ea'),
        alt: 'Sala interior de apartamento, imagem ilustrativa',
      },
    ],
  },
]
