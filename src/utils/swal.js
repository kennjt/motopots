import Swal from "sweetalert2";

const baseConfig = {
  background: "#22222B",
  color: "#F5F5F5",
  showClose: true,
  buttonsStyling: false,
  customClass: {
    popup: "motopots-swal-popup",
    title: "motopots-swal-title",
    htmlContainer: "motopots-swal-content",
    confirmButton: "motopots-swal-confirm",
    cancelButton: "motopots-swal-cancel",
  },
};

function showNotification({ icon, title, text = "", timer, desktopToastPosition }) {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;
  const useToast = isMobile || Boolean(desktopToastPosition);

  return Swal.fire({
    ...baseConfig,
    icon,
    title,
    text,
    ...(useToast
      ? {
          toast: true,
          position: isMobile ? "top" : desktopToastPosition,
          timer,
          showConfirmButton: false,
          timerProgressBar: true,
          customClass: {
            ...baseConfig.customClass,
            container: "motopots-swal-toast-container",
          },
        }
      : { confirmButtonText: "Okay" }),
  });
}

export function showSuccess(title, text = "") {
  return showNotification({
    icon: "success",
    title,
    text,
    timer: 2600,
    desktopToastPosition: "bottom-end",
  });
}

export function showError(title, text = "") {
  return showNotification({ icon: "error", title, text, timer: 5000 });
}

export function showWarning(title, text = "") {
  return showNotification({ icon: "warning", title, text, timer: 4500 });
}

export function showInfo(title, text = "") {
  return showNotification({ icon: "info", title, text, timer: 4000 });
}

export function showClosedStore(title, text = "") {
  return showNotification({ icon: "error", title, text, timer: 5000 });
}

export function showConfirm({ title, text, confirmText = "Yes, continue", cancelText = "Cancel", icon = "warning" }) {
  return Swal.fire({ ...baseConfig, icon, title, text, showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: cancelText, reverseButtons: true, focusCancel: true });
}
