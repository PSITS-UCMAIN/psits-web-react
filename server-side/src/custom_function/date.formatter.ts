export const getSgDate = () => {
  const date = new Date();
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const sgOffset = 8;
  return new Date(utc + sgOffset * 60 * 60000);
};
