// Swap a product's name/description to the requested language for the storefront.
// Russian falls back to the Uzbek value when empty, so nothing is ever blank.
type Localizable = {
  name: string;
  nameRu: string;
  description: string | null;
  descriptionRu: string | null;
};

export function localizeProduct<T extends Localizable>(product: T, lang?: string): T {
  if (lang === 'ru') {
    return {
      ...product,
      name: product.nameRu || product.name,
      description: product.descriptionRu ?? product.description,
    };
  }
  return product;
}

// Swap a category's name to the requested language (Russian falls back to Uzbek).
export function localizeCategory<T extends { name: string; nameRu: string }>(
  category: T,
  lang?: string,
): T {
  if (lang === 'ru') {
    return { ...category, name: category.nameRu || category.name };
  }
  return category;
}
