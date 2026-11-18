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

export function showSuccess(title, text = "") {
  return Swal.fire({
    ...baseConfig,
    toast: true,
    position: "bottom-end",
    icon: "success",
    title,
    text,
    timer: 2600,
    showConfirmButton: false,
    timerProgressBar: true,
    customClass: {
      ...baseConfig.customClass,
      container: "motopots-swal-toast-container",
    },
  });
}

export function showError(title, text = "") {
  return Swal.fire({ ...baseConfig, icon: "error", title, text, confirmButtonText: "Okay" });
}

export function showWarning(title, text = "") {
  return Swal.fire({ ...baseConfig, icon: "warning", title, text, confirmButtonText: "Okay" });
}

export function showInfo(title, text = "") {
  return Swal.fire({ ...baseConfig, icon: "info", title, text, confirmButtonText: "Okay" });
}

export function showClosedStore(title, text = "") {
  return Swal.fire({ ...baseConfig, icon: "error", title, text, confirmButtonText: "Okay" });
}

export function showConfirm({ title, text, confirmText = "Yes, continue", cancelText = "Cancel", icon = "warning" }) {
  return Swal.fire({ ...baseConfig, icon, title, text, showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: cancelText, reverseButtons: true, focusCancel: true });
}
