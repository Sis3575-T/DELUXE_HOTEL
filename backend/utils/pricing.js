export const calculateNights = (checkin, checkout) => {
  if (!checkin || !checkout || checkin >= checkout) return 0
  const start = new Date(`${checkin}T00:00:00`)
  const end = new Date(`${checkout}T00:00:00`)
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

export const calculateBookingPrice = (pricePerNight, checkin, checkout) => {
  const nights = calculateNights(checkin, checkout)
  const rate = Number(pricePerNight) || 0
  return {
    nights,
    pricePerNight: rate,
    totalAmount: nights * rate,
  }
}
