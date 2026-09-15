export const promoCodeGenerator = (promo_name: String) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let result = "PSITS-" + promo_name.toUpperCase() + "-";
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

export const refundCodeGenerator = () => {
  try {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let result = "REFUND-";
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
    return result;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to generate refund code");
  }
};
