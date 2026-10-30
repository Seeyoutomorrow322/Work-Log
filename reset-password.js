const SUPABASE_URL = "https://hdwkxlynuyunggrgvkvu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XiDSi6k6FDHr9D56c1a7TA_eQidQJ7w";

const resetStatus = document.querySelector("#reset-status");
const resetForm = document.querySelector("#reset-password-form");
const resetError = document.querySelector("#reset-error");
const savePasswordButton = document.querySelector("#save-password-button");
const loginLink = document.querySelector("#login-link");
let supabaseClient;

try {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("Supabase 연결 스크립트를 불러오지 못했습니다.");
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
  console.error("Unable to initialize Supabase for password reset.", error);
  resetStatus.textContent = "페이지를 초기화하지 못했습니다. 새로고침하거나 네트워크 연결을 확인해 주세요.";
  loginLink.hidden = false;
}

function showResetError(message) {
  resetError.textContent = message;
  resetError.hidden = !message;
}

async function initializePasswordReset() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
      throw error;
    }
    if (!session) {
      resetStatus.textContent = "재설정 링크가 만료되었거나 올바르지 않습니다. 다시 요청해 주세요.";
      loginLink.hidden = false;
      return;
    }

    resetStatus.textContent = "새 비밀번호를 입력하세요.";
    resetForm.hidden = false;
  } catch (error) {
    console.error("Unable to validate password reset link.", error);
    resetStatus.textContent = "재설정 링크를 확인하지 못했습니다. 새 링크를 요청해 주세요.";
    loginLink.hidden = false;
  }
}

if (supabaseClient) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showResetError("");
    if (!resetForm.reportValidity()) {
      return;
    }

    const password = document.querySelector("#new-password").value;
    const confirmation = document.querySelector("#confirm-password").value;
    if (password !== confirmation) {
      showResetError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    savePasswordButton.disabled = true;
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      resetForm.hidden = true;
      resetStatus.textContent = "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.";
      loginLink.hidden = false;
    } catch (error) {
      console.error("Supabase password update failed.", error);
      showResetError("비밀번호를 변경하지 못했습니다. 재설정 링크를 확인하고 다시 시도해 주세요.");
    } finally {
      savePasswordButton.disabled = false;
    }
  });

  void initializePasswordReset().catch((error) => {
    console.error("Unexpected password reset initialization failure.", error);
    resetStatus.textContent = "재설정 페이지를 초기화하지 못했습니다. 새 링크를 요청해 주세요.";
    loginLink.hidden = false;
  });
}
