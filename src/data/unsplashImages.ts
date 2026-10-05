// Curated photos from Unsplash (https://unsplash.com/license), hotlinked from images.unsplash.com.
// `id` is the short Unsplash photo id: the photo page is https://unsplash.com/photos/<id>.

export type UnsplashImage = {
  id: string;
  src: string;
  alt: string;
  photographer: string;
};

const photo = (id: string, path: string, alt: string, photographer: string): UnsplashImage => ({
  id,
  src: `https://images.unsplash.com/${path}`,
  alt,
  photographer,
});

export const siteImages = {
  hero: photo('-ViJiQk0vBg', 'photo-1645331465778-eb409d112198', 'Grain spilling from an open burlap sack', 'Adrian Gomez'),
  store: photo('SoMHwovUDqA', 'photo-1465176728568-7da7e336b1e9', 'Rows of stacked jute sacks in a store', 'ideadad'),
  warehouse: photo('d_BHc47AzLQ', 'photo-1774946103680-3d34a461a581', 'Bagged ingredients stacked on pallets in a warehouse', 'UZ Creative Services'),
};

export const categoryImages: Record<string, UnsplashImage> = {
  'protein-feeds': photo('5hv5dMdZod4', 'photo-1728931340168-3869028e99e7', 'Whole soybeans', '360floralflaves'),
  'energy-feeds': photo('qjHXkBJw9lo', 'photo-1779991953288-621a1342f6ef', 'Sorghum crop ready for harvest', 'juan saav'),
  'fiber-products': photo('zwZusrYAGoM', 'photo-1515276427842-f85802d514a2', 'Hand holding wheat ears above a wheat field', 'Paz Arando'),
  minerals: photo('y6r0r77k4ek', 'photo-1737098140591-f0988ae7e15a', 'Pile of fine white mineral powder', 'Maria Kovalets'),
  'amino-acids': photo('S9NchuPb79I', 'photo-1593095948071-474c5cc2989d', 'Scoop of white crystalline powder', 'HowToGym'),
  'premixes-additives': photo('75NM8EgQkqc', 'photo-1755870191151-8be8e96efcb0', 'Paper sacks stacked against a wall', 'T'),
};

export const productImages: Record<string, UnsplashImage> = {
  'soybean-meal': photo('SW0yfTSLpXA', 'photo-1728931339661-1ea66004a2e6', 'Close-up of soybeans', '360floralflaves'),
  sorghum: photo('APO54_JBmus', 'photo-1560327301-ad5b41c8b575', 'Ripe red sorghum seed head', 'John Lord Auman'),
  'wheat-bran': photo('tyVcPQfncrg', 'photo-1561767782-d8e3aa77ef77', 'Close-up of cereal bran flakes', 'Utsman Media'),
  'sunflower-meal': photo('cpomWTWhOVU', 'photo-1706961089562-217ab7d06dfd', 'Pile of sunflower seeds', 'engin akyurt'),
  'fish-meal': photo('uS3PQYEXZyA', 'photo-1578428153977-6b309954a1e2', 'Dried fish laid out on a rack', 'Alex Bell'),
  lysine: photo('bIsybhfGPME', 'photo-1704650311140-aba27da8623d', 'Scoop of fine off-white powder', 'Alex Saks'),
  methionine: photo('iYWf4PEd-lI', 'photo-1704650312191-005ab02786f5', 'Fine powder spread around a measuring scoop', 'Alex Saks'),
  dcp: photo('pGJBkuqN27k', 'photo-1586137712370-9b450509c587', 'Bowl heaped with white mineral powder', 'Pesce Huang'),
  limestone: photo('JwYtRXTtZBQ', 'photo-1534259362708-6d0c72ccdf3e', 'Small pile of ground grey limestone', 'Adrien Olichon'),
  premix: photo('MUlIfSNODXE', 'photo-1693996046865-19217d179161', 'Powder premix spilling from a scoop', 'Alex Saks'),
};

export const animalImages: Record<string, UnsplashImage> = {
  pigs: photo('d8-XXOLU_5A', 'photo-1697027948105-902321ea8e29', 'Grower pigs in a pen', 'Stefanie Poepken'),
  poultry: photo('mJ7ghTbKXYo', 'photo-1569466593977-94ee7ed02ec9', 'Hens gathered around a feeder', 'Arisa Chattasa'),
  cattle: photo('slDCGrK8LOM', 'photo-1636998980792-63f27ddea4e3', 'Dairy cows feeding at a barn feed rail', 'Suvrajit S'),
  other: photo('WUWGO6xmvoY', 'photo-1593750187970-84858a2aaf5e', 'Goats in a farm yard', 'Jorge Salvador'),
};

// Keyed by the knowledge article's image label.
export const knowledgeImages: Record<string, UnsplashImage> = {
  'pigs at the trough': photo('ZE8TEMZNyTA', 'photo-1703773144223-09c8781b0c12', 'Pig eating as feed pellets pour into the trough', 'Sam Carden'),
  'spec sheet on a bag': photo('B_ZAmNAiJ-Y', 'photo-1566378577671-2375b0a1d4ca', 'Printed feed sacks stacked together', 'Markus Winkler'),
  'wheat bran in hand': photo('QyxZ10rASzc', 'photo-1738598666720-e7b783caef8a', 'Hand holding grain over a grain bin', 'Being Organic in EU'),
  'layer flock': photo('tp9Y4_w9DIA', 'photo-1553531009-c4605f302b47', 'Brown laying hens at a coop door', 'Brett Jordan'),
  'farmer with records': photo('PDkRbepFs7I', 'photo-1680392407889-65688574ce96', 'Farmer taking notes beside cattle pens', 'Howard R Wheeler'),
  'on-farm mixer': photo('tX6RnbjvZoA', 'photo-1781711281462-ede4f05a6e70', 'Hand holding grain above a full mixing bin', 'Emma Renly'),
  'dairy cows feeding': photo('2Prc5cSgNJE', 'photo-1629313472434-cbbfdc2e1a5f', 'Dairy cows at a feed barrier', 'Austin Santaniello'),
};
