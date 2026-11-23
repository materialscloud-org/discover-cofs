// Where the data comes from: the static files of public/data/ (scripts/prepareForFrontend.py).
export const DATA = `${import.meta.env.BASE_URL}data/`;

export async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} (${url})`);
  return response.json();
}
