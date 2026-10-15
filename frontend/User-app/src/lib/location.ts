export interface CurrentLocation {
  latitude: number;
  longitude: number;
  address: string;
  ward: string;
  province: string;
}

function getBrowserCoordinates(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Thiết bị không hỗ trợ định vị GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error("Hãy cho phép vị trí GPS để tự điền địa chỉ.")),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  });
}

export async function getCurrentLocation(fetchApi: <T>(path: string, init?: RequestInit) => Promise<T>): Promise<CurrentLocation> {
  const coordinates = await getBrowserCoordinates();
  const address = await fetchApi<Pick<CurrentLocation, "address" | "ward" | "province">>(
    `/repair-requests/reverse-geocode?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}`
  );
  return { latitude: coordinates.latitude, longitude: coordinates.longitude, ...address };
}
