import { Notyf } from "notyf";
import "notyf/notyf.min.css";

type ToastType = "success" | "error" | "info" | "warning";

const notyf = new Notyf({
  duration: 2000,
  position: { x: "right", y: "top" },
});

export const showToast = (type: ToastType, message: string): void => {
  switch (type) {
    case "success":
      notyf.success(message);
      break;
    case "info":
      notyf.open({ type: "info", message });
      break;
    case "warning":
      notyf.open({ type: "warning", message });
      break;
    case "error":
    default:
      notyf.error(message);
      break;
  }
};

export default showToast;
