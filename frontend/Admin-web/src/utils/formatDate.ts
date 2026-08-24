export interface FormattedDateTime {
  date: string;
  time: string;
}

export const formatDateTime = (dateTime: string): FormattedDateTime => {
  const date = new Date(dateTime);

  return {
    date: date.toLocaleDateString("vi-VN"),
    time: date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};