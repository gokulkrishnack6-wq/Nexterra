/**
 * Authentic Kerala Administrative Geography Dataset
 * Covers all 14 Districts, all 6 Municipal Corporations, and all 87 Municipalities.
 * Provides canonical centroid coordinates, administrative hierarchy, and lookup utilities.
 */

export interface MunicipalBody {
  id: string;
  name: string;
  type: 'corporation' | 'municipality';
  district: string;
  latitude: number;
  longitude: number;
  pincode?: string;
  description: string;
}

export interface KeralaDistrictInfo {
  name: string;
  headquarters: string;
  latitude: number;
  longitude: number;
  corporationCount: number;
  municipalityCount: number;
}

export const KERALA_DISTRICTS: KeralaDistrictInfo[] = [
  { name: 'Kasaragod', headquarters: 'Kasaragod', latitude: 12.4996, longitude: 74.9869, corporationCount: 0, municipalityCount: 3 },
  { name: 'Kannur', headquarters: 'Kannur', latitude: 11.8745, longitude: 75.3704, corporationCount: 1, municipalityCount: 9 },
  { name: 'Wayanad', headquarters: 'Kalpetta', latitude: 11.6050, longitude: 76.0830, corporationCount: 0, municipalityCount: 3 },
  { name: 'Kozhikode', headquarters: 'Kozhikode', latitude: 11.2588, longitude: 75.7804, corporationCount: 1, municipalityCount: 7 },
  { name: 'Malappuram', headquarters: 'Malappuram', latitude: 11.0510, longitude: 76.0711, corporationCount: 0, municipalityCount: 12 },
  { name: 'Palakkad', headquarters: 'Palakkad', latitude: 10.7867, longitude: 76.6548, corporationCount: 0, municipalityCount: 7 },
  { name: 'Thrissur', headquarters: 'Thrissur', latitude: 10.5276, longitude: 76.2144, corporationCount: 1, municipalityCount: 7 },
  { name: 'Ernakulam', headquarters: 'Kochi', latitude: 9.9816, longitude: 76.2999, corporationCount: 1, municipalityCount: 13 },
  { name: 'Idukki', headquarters: 'Painavu', latitude: 9.8500, longitude: 76.9667, corporationCount: 0, municipalityCount: 2 },
  { name: 'Kottayam', headquarters: 'Kottayam', latitude: 9.5916, longitude: 76.5222, corporationCount: 0, municipalityCount: 6 },
  { name: 'Alappuzha', headquarters: 'Alappuzha', latitude: 9.4981, longitude: 76.3388, corporationCount: 0, municipalityCount: 6 },
  { name: 'Pathanamthitta', headquarters: 'Pathanamthitta', latitude: 9.2648, longitude: 76.7870, corporationCount: 0, municipalityCount: 4 },
  { name: 'Kollam', headquarters: 'Kollam', latitude: 8.8932, longitude: 76.6141, corporationCount: 1, municipalityCount: 4 },
  { name: 'Thiruvananthapuram', headquarters: 'Thiruvananthapuram', latitude: 8.5241, longitude: 76.9366, corporationCount: 1, municipalityCount: 4 },
];

/**
 * Complete directory of all 6 Municipal Corporations + 87 Municipalities in Kerala (Total: 93 ULBs)
 */
export const KERALA_MUNICIPAL_BODIES: MunicipalBody[] = [
  // ==========================================
  // THIRUVANANTHAPURAM DISTRICT (1 Corp + 4 Mun)
  // ==========================================
  {
    id: 'tvm-corp',
    name: 'Thiruvananthapuram',
    type: 'corporation',
    district: 'Thiruvananthapuram',
    latitude: 8.5241,
    longitude: 76.9366,
    pincode: '695001',
    description: 'Capital Municipal Corporation with 100 administrative wards, primary centralized RRF, and decentralized ward MCFs.'
  },
  {
    id: 'tvm-neyyattinkara',
    name: 'Neyyattinkara',
    type: 'municipality',
    district: 'Thiruvananthapuram',
    latitude: 8.4018,
    longitude: 77.0869,
    pincode: '695121',
    description: 'Neyyattinkara Municipal Council waste recovery station and public transit segregated bins.'
  },
  {
    id: 'tvm-attingal',
    name: 'Attingal',
    type: 'municipality',
    district: 'Thiruvananthapuram',
    latitude: 8.6961,
    longitude: 76.8143,
    pincode: '695101',
    description: 'Attingal Municipal waste management facility, pioneering clean city initiatives.'
  },
  {
    id: 'tvm-nedumangad',
    name: 'Nedumangad',
    type: 'municipality',
    district: 'Thiruvananthapuram',
    latitude: 8.6017,
    longitude: 77.0006,
    pincode: '695541',
    description: 'Nedumangad Town and market waste sorting hub.'
  },
  {
    id: 'tvm-varkala',
    name: 'Varkala',
    type: 'municipality',
    district: 'Thiruvananthapuram',
    latitude: 8.7379,
    longitude: 76.7163,
    pincode: '695141',
    description: 'Varkala Coastal & Tourism Zone waste collection and beach segregation bins.'
  },

  // ==========================================
  // KOLLAM DISTRICT (1 Corp + 4 Mun)
  // ==========================================
  {
    id: 'kollam-corp',
    name: 'Kollam',
    type: 'corporation',
    district: 'Kollam',
    latitude: 8.8932,
    longitude: 76.6141,
    pincode: '691001',
    description: 'Kollam City Corporation central recycling facility and port area waste bins.'
  },
  {
    id: 'kollam-paravur',
    name: 'Paravur',
    type: 'municipality',
    district: 'Kollam',
    latitude: 8.8042,
    longitude: 76.6667,
    pincode: '691301',
    description: 'Paravur Municipal lakeside collection facility.'
  },
  {
    id: 'kollam-punalur',
    name: 'Punalur',
    type: 'municipality',
    district: 'Kollam',
    latitude: 9.0194,
    longitude: 76.9278,
    pincode: '691305',
    description: 'Punalur Municipality hilly terrain bio & plastic collection hub.'
  },
  {
    id: 'kollam-kottarakkara',
    name: 'Kottarakkara',
    type: 'municipality',
    district: 'Kollam',
    latitude: 9.0000,
    longitude: 76.7667,
    pincode: '691506',
    description: 'Kottarakkara Central Bus Station and municipal collection point.'
  },
  {
    id: 'kollam-karunagappally',
    name: 'Karunagappally',
    type: 'municipality',
    district: 'Kollam',
    latitude: 9.0556,
    longitude: 76.5361,
    pincode: '690518',
    description: 'Karunagappally coastal commercial town waste collection facility.'
  },

  // ==========================================
  // PATHANAMTHITTA DISTRICT (4 Mun)
  // ==========================================
  {
    id: 'pta-pathanamthitta',
    name: 'Pathanamthitta',
    type: 'municipality',
    district: 'Pathanamthitta',
    latitude: 9.2648,
    longitude: 76.7870,
    pincode: '689645',
    description: 'Pathanamthitta District headquarters municipal resource recovery centre.'
  },
  {
    id: 'pta-thiruvalla',
    name: 'Thiruvalla',
    type: 'municipality',
    district: 'Pathanamthitta',
    latitude: 9.3833,
    longitude: 76.5750,
    pincode: '689101',
    description: 'Thiruvalla commercial hub municipal material collection facility.'
  },
  {
    id: 'pta-adoor',
    name: 'Adoor',
    type: 'municipality',
    district: 'Pathanamthitta',
    latitude: 9.1550,
    longitude: 76.7330,
    pincode: '691523',
    description: 'Adoor Central junction segregated bins and Haritha Karma Sena depot.'
  },
  {
    id: 'pta-pandalam',
    name: 'Pandalam',
    type: 'municipality',
    district: 'Pathanamthitta',
    latitude: 9.2300,
    longitude: 76.6800,
    pincode: '689501',
    description: 'Pandalam Pilgrim corridor waste management station.'
  },

  // ==========================================
  // ALAPPUZHA DISTRICT (6 Mun)
  // ==========================================
  {
    id: 'alp-alappuzha',
    name: 'Alappuzha',
    type: 'municipality',
    district: 'Alappuzha',
    latitude: 9.4981,
    longitude: 76.3388,
    pincode: '688001',
    description: 'Alappuzha Municipality renowned decentralized canal & ward segregation network.'
  },
  {
    id: 'alp-cherthala',
    name: 'Cherthala',
    type: 'municipality',
    district: 'Alappuzha',
    latitude: 9.6844,
    longitude: 76.3347,
    pincode: '688524',
    description: 'Cherthala industrial and coir zone waste collection unit.'
  },
  {
    id: 'alp-kayamkulam',
    name: 'Kayamkulam',
    type: 'municipality',
    district: 'Alappuzha',
    latitude: 9.1764,
    longitude: 76.5008,
    pincode: '690502',
    description: 'Kayamkulam Municipal RRF and thermal buffer zone collection.'
  },
  {
    id: 'alp-mavelikkara',
    name: 'Mavelikkara',
    type: 'municipality',
    district: 'Alappuzha',
    latitude: 9.2667,
    longitude: 76.5500,
    pincode: '690101',
    description: 'Mavelikkara historical town municipal dry-waste sorting depot.'
  },
  {
    id: 'alp-chengannur',
    name: 'Chengannur',
    type: 'municipality',
    district: 'Alappuzha',
    latitude: 9.3167,
    longitude: 76.6167,
    pincode: '689121',
    description: 'Chengannur Railway transit gate waste drop point.'
  },
  {
    id: 'alp-haripad',
    name: 'Haripad',
    type: 'municipality',
    district: 'Alappuzha',
    latitude: 9.2833,
    longitude: 76.4667,
    pincode: '690514',
    description: 'Haripad Municipality agricultural & plastic recovery unit.'
  },

  // ==========================================
  // KOTTAYAM DISTRICT (6 Mun)
  // ==========================================
  {
    id: 'ktm-kottayam',
    name: 'Kottayam',
    type: 'municipality',
    district: 'Kottayam',
    latitude: 9.5916,
    longitude: 76.5222,
    pincode: '686001',
    description: 'Kottayam Municipal Headquarters recycling yard and public litter bins.'
  },
  {
    id: 'ktm-changanassery',
    name: 'Changanassery',
    type: 'municipality',
    district: 'Kottayam',
    latitude: 9.4444,
    longitude: 76.5417,
    pincode: '686101',
    description: 'Changanassery Market and canal front segregation centre.'
  },
  {
    id: 'ktm-pala',
    name: 'Pala',
    type: 'municipality',
    district: 'Kottayam',
    latitude: 9.7083,
    longitude: 76.6833,
    pincode: '686575',
    description: 'Pala Meenachil river valley resource recovery station.'
  },
  {
    id: 'ktm-vaikom',
    name: 'Vaikom',
    type: 'municipality',
    district: 'Kottayam',
    latitude: 9.7500,
    longitude: 76.3958,
    pincode: '686141',
    description: 'Vaikom Temple town and backwater municipal waste collection point.'
  },
  {
    id: 'ktm-ettumanoor',
    name: 'Ettumanoor',
    type: 'municipality',
    district: 'Kottayam',
    latitude: 9.6694,
    longitude: 76.5625,
    pincode: '686631',
    description: 'Ettumanoor Highway junction municipal recovery facility.'
  },
  {
    id: 'ktm-erattupetta',
    name: 'Erattupetta',
    type: 'municipality',
    district: 'Kottayam',
    latitude: 9.6975,
    longitude: 76.7836,
    pincode: '686121',
    description: 'Erattupetta Foothills municipal non-biodegradable waste depot.'
  },

  // ==========================================
  // IDUKKI DISTRICT (2 Mun)
  // ==========================================
  {
    id: 'idk-thodupuzha',
    name: 'Thodupuzha',
    type: 'municipality',
    district: 'Idukki',
    latitude: 9.8958,
    longitude: 76.7139,
    pincode: '685584',
    description: 'Thodupuzha Gateway to High Ranges municipal sorting and baling plant.'
  },
  {
    id: 'idk-kattappana',
    name: 'Kattappana',
    type: 'municipality',
    district: 'Idukki',
    latitude: 9.7500,
    longitude: 77.1167,
    pincode: '685508',
    description: 'Kattappana High Range spice plantation municipal recovery facility.'
  },

  // ==========================================
  // ERNAKULAM DISTRICT (1 Corp + 13 Mun)
  // ==========================================
  {
    id: 'ekm-kochi',
    name: 'Kochi',
    type: 'corporation',
    district: 'Ernakulam',
    latitude: 9.9658,
    longitude: 76.2421,
    pincode: '682001',
    description: 'Kochi Municipal Corporation (Cochin) port, metro, and urban recycling network.'
  },
  {
    id: 'ekm-aluva',
    name: 'Aluva',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.1076,
    longitude: 76.3516,
    pincode: '683101',
    description: 'Aluva Periyar river bank municipal MCF and railway segregated bins.'
  },
  {
    id: 'ekm-kalamassery',
    name: 'Kalamassery',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.0537,
    longitude: 76.3197,
    pincode: '682033',
    description: 'Kalamassery Industrial & University zone modern baling and recovery facility.'
  },
  {
    id: 'ekm-tripunithura',
    name: 'Tripunithura',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 9.9489,
    longitude: 76.3494,
    pincode: '682301',
    description: 'Tripunithura Heritage town municipal dry-waste recovery center.'
  },
  {
    id: 'ekm-angamaly',
    name: 'Angamaly',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.1960,
    longitude: 76.3860,
    pincode: '683572',
    description: 'Angamaly North transit hub and industrial collection facility.'
  },
  {
    id: 'ekm-north-paravur',
    name: 'North Paravur',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.1477,
    longitude: 76.2307,
    pincode: '683513',
    description: 'North Paravur Muziris heritage circuit collection depot.'
  },
  {
    id: 'ekm-perumbavoor',
    name: 'Perumbavoor',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.1115,
    longitude: 76.4789,
    pincode: '683542',
    description: 'Perumbavoor Timber & commercial hub municipal recovery station.'
  },
  {
    id: 'ekm-kothamangalam',
    name: 'Kothamangalam',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.0634,
    longitude: 76.6267,
    pincode: '686691',
    description: 'Kothamangalam Foothills municipal waste collection unit.'
  },
  {
    id: 'ekm-muvattupuzha',
    name: 'Muvattupuzha',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 9.9894,
    longitude: 76.5790,
    pincode: '686661',
    description: 'Muvattupuzha Tri-river confluence municipal recovery center.'
  },
  {
    id: 'ekm-maradu',
    name: 'Maradu',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 9.9325,
    longitude: 76.3242,
    pincode: '682304',
    description: 'Maradu Sub-urban waterfront municipal collection point.'
  },
  {
    id: 'ekm-eloor',
    name: 'Eloor',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.0717,
    longitude: 76.2981,
    pincode: '683501',
    description: 'Eloor Industrial corridor environmental waste monitoring hub.'
  },
  {
    id: 'ekm-thrikkakara',
    name: 'Thrikkakara',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 10.0350,
    longitude: 76.3400,
    pincode: '682021',
    description: 'Thrikkakara SmartCity/Infopark IT zone modern segregated waste drop hubs.'
  },
  {
    id: 'ekm-piravom',
    name: 'Piravom',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 9.8667,
    longitude: 76.4833,
    pincode: '686664',
    description: 'Piravom Riverfront municipal waste sorting depot.'
  },
  {
    id: 'ekm-koothattukulam',
    name: 'Koothattukulam',
    type: 'municipality',
    district: 'Ernakulam',
    latitude: 9.8617,
    longitude: 76.5847,
    pincode: '686662',
    description: 'Koothattukulam Southern border agricultural and plastic recovery depot.'
  },

  // ==========================================
  // THRISSUR DISTRICT (1 Corp + 7 Mun)
  // ==========================================
  {
    id: 'tsr-corp',
    name: 'Thrissur',
    type: 'corporation',
    district: 'Thrissur',
    latitude: 10.5276,
    longitude: 76.2144,
    pincode: '680001',
    description: 'Thrissur Cultural Capital Corporation RRF and Swaraj Round public smart bins.'
  },
  {
    id: 'tsr-chalakudy',
    name: 'Chalakudy',
    type: 'municipality',
    district: 'Thrissur',
    latitude: 10.3070,
    longitude: 76.3330,
    pincode: '680307',
    description: 'Chalakudy River basin municipal recovery facility.'
  },
  {
    id: 'tsr-kunnamkulam',
    name: 'Kunnamkulam',
    type: 'municipality',
    district: 'Thrissur',
    latitude: 10.6508,
    longitude: 76.0722,
    pincode: '680503',
    description: 'Kunnamkulam Commercial printing & trade town collection depot.'
  },
  {
    id: 'tsr-irinjalakuda',
    name: 'Irinjalakuda',
    type: 'municipality',
    district: 'Thrissur',
    latitude: 10.3444,
    longitude: 76.2089,
    pincode: '680121',
    description: 'Irinjalakuda Municipal central segregation unit.'
  },
  {
    id: 'tsr-kodungallur',
    name: 'Kodungallur',
    type: 'municipality',
    district: 'Thrissur',
    latitude: 10.2267,
    longitude: 76.1950,
    pincode: '680664',
    description: 'Kodungallur Port city municipal resource recovery centre.'
  },
  {
    id: 'tsr-chavakkad',
    name: 'Chavakkad',
    type: 'municipality',
    district: 'Thrissur',
    latitude: 10.5833,
    longitude: 76.0333,
    pincode: '680506',
    description: 'Chavakkad Coastal municipal plastic and dry waste station.'
  },
  {
    id: 'tsr-guruvayur',
    name: 'Guruvayur',
    type: 'municipality',
    district: 'Thrissur',
    latitude: 10.5947,
    longitude: 76.0407,
    pincode: '680101',
    description: 'Guruvayur Temple township intensive bio-methanation and dry waste segregation.'
  },
  {
    id: 'tsr-wadakkanchery',
    name: 'Wadakkanchery',
    type: 'municipality',
    district: 'Thrissur',
    latitude: 10.6622,
    longitude: 76.2444,
    pincode: '680582',
    description: 'Wadakkanchery Valley municipal resource recovery center.'
  },

  // ==========================================
  // PALAKKAD DISTRICT (7 Mun)
  // ==========================================
  {
    id: 'pkd-palakkad',
    name: 'Palakkad',
    type: 'municipality',
    district: 'Palakkad',
    latitude: 10.7867,
    longitude: 76.6548,
    pincode: '678001',
    description: 'Palakkad Granary of Kerala municipal central baling plant and public bins.'
  },
  {
    id: 'pkd-chittur',
    name: 'Chittur-Thathamangalam',
    type: 'municipality',
    district: 'Palakkad',
    latitude: 10.7000,
    longitude: 76.7167,
    pincode: '678101',
    description: 'Chittur twin municipal town agricultural and packaging waste depot.'
  },
  {
    id: 'pkd-ottapalam',
    name: 'Ottapalam',
    type: 'municipality',
    district: 'Palakkad',
    latitude: 10.7725,
    longitude: 76.3811,
    pincode: '679101',
    description: 'Ottapalam Bharathapuzha riverside collection facility.'
  },
  {
    id: 'pkd-shornur',
    name: 'Shornur',
    type: 'municipality',
    district: 'Palakkad',
    latitude: 10.7600,
    longitude: 76.2700,
    pincode: '679121',
    description: 'Shornur Major railway junction transit waste segregated hubs.'
  },
  {
    id: 'pkd-mannarkkad',
    name: 'Mannarkkad',
    type: 'municipality',
    district: 'Palakkad',
    latitude: 10.9889,
    longitude: 76.4611,
    pincode: '678582',
    description: 'Mannarkkad Silent Valley eco-sensitive boundary municipal recovery facility.'
  },
  {
    id: 'pkd-cherpulassery',
    name: 'Cherpulassery',
    type: 'municipality',
    district: 'Palakkad',
    latitude: 10.8800,
    longitude: 76.3100,
    pincode: '679503',
    description: 'Cherpulassery Central municipal recycling facility.'
  },
  {
    id: 'pkd-pattambi',
    name: 'Pattambi',
    type: 'municipality',
    district: 'Palakkad',
    latitude: 10.8000,
    longitude: 76.1800,
    pincode: '679303',
    description: 'Pattambi River basin market area waste collection centre.'
  },

  // ==========================================
  // MALAPPURAM DISTRICT (12 Mun)
  // ==========================================
  {
    id: 'mlp-malappuram',
    name: 'Malappuram',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 11.0510,
    longitude: 76.0711,
    pincode: '676505',
    description: 'Malappuram District headquarters central resource recovery facility.'
  },
  {
    id: 'mlp-manjeri',
    name: 'Manjeri',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 11.1189,
    longitude: 76.1217,
    pincode: '676121',
    description: 'Manjeri Major commercial and medical college municipal facility.'
  },
  {
    id: 'mlp-perinthalmanna',
    name: 'Perinthalmanna',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 10.9781,
    longitude: 76.2269,
    pincode: '679322',
    description: 'Perinthalmanna Hospital city specialized sanitary and dry waste segregation.'
  },
  {
    id: 'mlp-tirur',
    name: 'Tirur',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 10.9150,
    longitude: 75.9230,
    pincode: '676101',
    description: 'Tirur Coastal trade and railway junction municipal recovery unit.'
  },
  {
    id: 'mlp-ponnani',
    name: 'Ponnani',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 10.7700,
    longitude: 75.9250,
    pincode: '679577',
    description: 'Ponnani Historic port and fishing harbor waste collection station.'
  },
  {
    id: 'mlp-kottakkal',
    name: 'Kottakkal',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 11.0000,
    longitude: 76.0000,
    pincode: '676503',
    description: 'Kottakkal Ayurveda capital green eco-sanitation and packaging facility.'
  },
  {
    id: 'mlp-nilambur',
    name: 'Nilambur',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 11.2778,
    longitude: 76.2269,
    pincode: '679329',
    description: 'Nilambur Teak forest border municipal resource recovery centre.'
  },
  {
    id: 'mlp-kondotty',
    name: 'Kondotty',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 11.1472,
    longitude: 75.9644,
    pincode: '673638',
    description: 'Kondotty Calicut Airport transit corridor municipal recovery facility.'
  },
  {
    id: 'mlp-valanchery',
    name: 'Valanchery',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 10.8833,
    longitude: 76.0667,
    pincode: '676552',
    description: 'Valanchery Highway intersection dry waste collection centre.'
  },
  {
    id: 'mlp-tanur',
    name: 'Tanur',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 10.9750,
    longitude: 75.8750,
    pincode: '676302',
    description: 'Tanur Coastal municipal plastic recovery unit.'
  },
  {
    id: 'mlp-parappanangadi',
    name: 'Parappanangadi',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 11.0500,
    longitude: 75.8600,
    pincode: '676303',
    description: 'Parappanangadi Coastal railway town municipal collection facility.'
  },
  {
    id: 'mlp-tirurangadi',
    name: 'Tirurangadi',
    type: 'municipality',
    district: 'Malappuram',
    latitude: 11.0333,
    longitude: 75.9333,
    pincode: '676306',
    description: 'Tirurangadi Historical educational municipal sorting unit.'
  },

  // ==========================================
  // KOZHIKODE DISTRICT (1 Corp + 7 Mun)
  // ==========================================
  {
    id: 'kkd-corp',
    name: 'Kozhikode',
    type: 'corporation',
    district: 'Kozhikode',
    latitude: 11.2588,
    longitude: 75.7804,
    pincode: '673001',
    description: 'Kozhikode Municipal Corporation Beachfront segregated smart bins and Njeliyanparambu RRF.'
  },
  {
    id: 'kkd-vadakara',
    name: 'Vadakara',
    type: 'municipality',
    district: 'Kozhikode',
    latitude: 11.6053,
    longitude: 75.5908,
    pincode: '673101',
    description: 'Vadakara North commercial port municipal baling facility.'
  },
  {
    id: 'kkd-koyilandy',
    name: 'Koyilandy',
    type: 'municipality',
    district: 'Kozhikode',
    latitude: 11.4367,
    longitude: 75.6983,
    pincode: '673305',
    description: 'Koyilandy Fishing harbour and railway transit waste bins.'
  },
  {
    id: 'kkd-ramanattukara',
    name: 'Ramanattukara',
    type: 'municipality',
    district: 'Kozhikode',
    latitude: 11.1750,
    longitude: 75.8660,
    pincode: '673633',
    description: 'Ramanattukara Bypass junction municipal recovery hub.'
  },
  {
    id: 'kkd-feroke',
    name: 'Feroke',
    type: 'municipality',
    district: 'Kozhikode',
    latitude: 11.1667,
    longitude: 75.8333,
    pincode: '673631',
    description: 'Feroke Chaliyar riverbank industrial tile & waste facility.'
  },
  {
    id: 'kkd-payyoli',
    name: 'Payyoli',
    type: 'municipality',
    district: 'Kozhikode',
    latitude: 11.5200,
    longitude: 75.6400,
    pincode: '673522',
    description: 'Payyoli Coastal marine sanctuary municipal collection depot.'
  },
  {
    id: 'kkd-koduvally',
    name: 'Koduvally',
    type: 'municipality',
    district: 'Kozhikode',
    latitude: 11.3567,
    longitude: 75.9122,
    pincode: '673572',
    description: 'Koduvally Commercial gold hub municipal sorting depot.'
  },
  {
    id: 'kkd-mukkam',
    name: 'Mukkam',
    type: 'municipality',
    district: 'Kozhikode',
    latitude: 11.3167,
    longitude: 75.9833,
    pincode: '673602',
    description: 'Mukkam Iruvanjippuzha valley municipal recovery facility.'
  },

  // ==========================================
  // WAYANAD DISTRICT (3 Mun)
  // ==========================================
  {
    id: 'wyd-kalpetta',
    name: 'Kalpetta',
    type: 'municipality',
    district: 'Wayanad',
    latitude: 11.6050,
    longitude: 76.0830,
    pincode: '673121',
    description: 'Kalpetta District headquarters eco-sensitive Western Ghats municipal facility.'
  },
  {
    id: 'wyd-mananthavady',
    name: 'Mananthavady',
    type: 'municipality',
    district: 'Wayanad',
    latitude: 11.8028,
    longitude: 76.0036,
    pincode: '670645',
    description: 'Mananthavady Northern highland municipal recycling depot.'
  },
  {
    id: 'wyd-sulthan-bathery',
    name: 'Sulthan Bathery',
    type: 'municipality',
    district: 'Wayanad',
    latitude: 11.6622,
    longitude: 76.2575,
    pincode: '673592',
    description: 'Sulthan Bathery Cleanest municipal town winner plastic recovery and smart bins.'
  },

  // ==========================================
  // KANNUR DISTRICT (1 Corp + 8 Mun)
  // ==========================================
  {
    id: 'knr-corp',
    name: 'Kannur',
    type: 'corporation',
    district: 'Kannur',
    latitude: 11.8745,
    longitude: 75.3704,
    pincode: '670001',
    description: 'Kannur Municipal Corporation Central RRF, Payyambalam beach bins, and railway hubs.'
  },
  {
    id: 'knr-thalassery',
    name: 'Thalassery',
    type: 'municipality',
    district: 'Kannur',
    latitude: 11.7483,
    longitude: 75.4894,
    pincode: '670101',
    description: 'Thalassery Heritage coastline municipal recovery center.'
  },
  {
    id: 'knr-payyanur',
    name: 'Payyanur',
    type: 'municipality',
    district: 'Kannur',
    latitude: 12.1000,
    longitude: 75.2000,
    pincode: '670307',
    description: 'Payyanur Northern green energy and plastic sorting center.'
  },
  {
    id: 'knr-taliparamba',
    name: 'Taliparamba',
    type: 'municipality',
    district: 'Kannur',
    latitude: 12.0400,
    longitude: 75.3600,
    pincode: '670141',
    description: 'Taliparamba Commercial agricultural municipal collection unit.'
  },
  {
    id: 'knr-mattannur',
    name: 'Mattannur',
    type: 'municipality',
    district: 'Kannur',
    latitude: 11.9300,
    longitude: 75.5700,
    pincode: '670702',
    description: 'Mattannur Kannur International Airport gateway municipal facility.'
  },
  {
    id: 'knr-koothuparamba',
    name: 'Koothuparamba',
    type: 'municipality',
    district: 'Kannur',
    latitude: 11.8300,
    longitude: 75.5700,
    pincode: '670643',
    description: 'Koothuparamba Hill tract municipal recovery facility.'
  },
  {
    id: 'knr-anthoor',
    name: 'Anthoor',
    type: 'municipality',
    district: 'Kannur',
    latitude: 11.9700,
    longitude: 75.3600,
    pincode: '670563',
    description: 'Anthoor Eco-park and industrial municipal facility.'
  },
  {
    id: 'knr-iritty',
    name: 'Iritty',
    type: 'municipality',
    district: 'Kannur',
    latitude: 11.9800,
    longitude: 75.6700,
    pincode: '670703',
    description: 'Iritty Coorg highway junction municipal collection point.'
  },
  {
    id: 'knr-panoor',
    name: 'Panoor',
    type: 'municipality',
    district: 'Kannur',
    latitude: 11.7700,
    longitude: 75.5600,
    pincode: '670692',
    description: 'Panoor Eastern border municipal resource recovery unit.'
  },
  {
    id: 'knr-sreekandapuram',
    name: 'Sreekandapuram',
    type: 'municipality',
    district: 'Kannur',
    latitude: 12.0300,
    longitude: 75.5200,
    pincode: '670631',
    description: 'Sreekandapuram River valley municipal material recovery center and market bins.'
  },

  // ==========================================
  // KASARAGOD DISTRICT (3 Mun)
  // ==========================================
  {
    id: 'ksd-kasaragod',
    name: 'Kasaragod',
    type: 'municipality',
    district: 'Kasaragod',
    latitude: 12.4996,
    longitude: 74.9869,
    pincode: '671121',
    description: 'Kasaragod Municipal Corporation & town central MCF, New Bus Stand bins.'
  },
  {
    id: 'ksd-kanhangad',
    name: 'Kanhangad',
    type: 'municipality',
    district: 'Kasaragod',
    latitude: 12.3089,
    longitude: 75.0906,
    pincode: '671315',
    description: 'Kanhangad Largest municipal body in Kasaragod with central RRF and beach park bins.'
  },
  {
    id: 'ksd-nileshwaram',
    name: 'Nileshwaram',
    type: 'municipality',
    district: 'Kasaragod',
    latitude: 12.2536,
    longitude: 75.1311,
    pincode: '671314',
    description: 'Nileshwaram Cultural capital of Kasaragod municipal recovery depot.'
  },
];

/**
 * Helper to get all Municipal bodies belonging to a district.
 */
export function getMunicipalitiesByDistrict(district: string): MunicipalBody[] {
  if (!district || district === 'All Kerala') return KERALA_MUNICIPAL_BODIES;
  const dNorm = district.trim().toLowerCase();
  return KERALA_MUNICIPAL_BODIES.filter(
    (b) => b.district.toLowerCase() === dNorm
  );
}

/**
 * Finds the nearest Kerala Municipal Body or Corporation to given coordinates.
 */
export function findNearestMunicipalBody(
  lat: number,
  lon: number,
  districtFilter?: string
): { body: MunicipalBody; distanceKm: number } | null {
  const candidates = districtFilter && districtFilter !== 'All Kerala'
    ? getMunicipalitiesByDistrict(districtFilter)
    : KERALA_MUNICIPAL_BODIES;

  if (candidates.length === 0) return null;

  let nearest = candidates[0];
  let minDistance = Infinity;

  for (const c of candidates) {
    const d = calculateDistance(lat, lon, c.latitude, c.longitude);
    if (d < minDistance) {
      minDistance = d;
      nearest = c;
    }
  }

  return { body: nearest, distanceKm: Math.round(minDistance * 10) / 10 };
}

/**
 * Haversine formula calculation
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
