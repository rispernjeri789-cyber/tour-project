function icsDate(dateStr) {
  return dateStr.replaceAll("-", "");
}

export function downloadBookingIcs(booking, tour) {
  if (!booking?.travel_date) return;

  const start = icsDate(booking.travel_date);
  const uid = `${booking.id}@no-age-tour-and-travel`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NO AGE Tour and Travel//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `SUMMARY:${(tour?.title || booking.tour_title || "Safari").replaceAll(/[\r\n,;]/g, " ")}`,
    `DESCRIPTION:Booking reference ${booking.booking_reference}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${booking.booking_reference || "booking"}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
