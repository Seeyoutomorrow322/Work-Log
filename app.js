const SUPABASE_URL = "https://hdwkxlynuyunggrgvkvu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XiDSi6k6FDHr9D56c1a7TA_eQidQJ7w";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DEFAULT_AVATAR_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='21' r='12' fill='%23e7ece8'/%3E%3Cpath d='M9 59c0-14 10-23 23-23s23 9 23 23' fill='%23e7ece8'/%3E%3C/svg%3E";

      const authScreen = document.querySelector("#auth-screen");
      authScreen.classList.add("animate-in");
      const authForm = document.querySelector("#auth-form");
      const authStatus = document.querySelector("#auth-status");
      const authError = document.querySelector("#auth-error");
      const authSuccessToast = document.querySelector("#auth-success-toast");
      const forgotPasswordButton = document.querySelector("#forgot-password-button");
      const resetEmailDialog = document.querySelector("#reset-email-dialog");
      const resetEmailForm = document.querySelector("#reset-email-form");
      const resetEmailInput = document.querySelector("#reset-email");
      const resetEmailError = document.querySelector("#reset-email-error");
      const sendResetEmailButton = document.querySelector("#send-reset-email");
      const mainApp = document.querySelector("#main-app");
      const userDisplay = document.querySelector("#userDisplay");
      const userProfileContainer = document.querySelector("#userProfileCard");
      const nicknameModalOverlay = document.querySelector("#nicknameModalOverlay");
      const nicknameInput = document.querySelector("#nicknameInput");
      const saveNicknameBtn = document.querySelector("#saveNicknameBtn");
      const closeNicknameBtn = document.querySelector("#closeNicknameBtn");
      const nicknameForm = document.querySelector("#nickname-form");
      const nicknameError = document.querySelector("#nickname-error");
      const userProfileTrigger = document.querySelector("#user-profile-trigger");
      const avatarFileInput = document.querySelector("#avatar-file-input");
      const passwordModalOverlay = document.querySelector("#passwordModalOverlay");
      const passwordForm = document.querySelector("#password-form");
      const passwordError = document.querySelector("#password-error");
      const savePasswordBtn = document.querySelector("#savePasswordBtn");
      const messageDialog = document.querySelector("#message-dialog");
      const messageDialogText = document.querySelector("#message-dialog-text");
      const messageDialogCancel = document.querySelector("#message-dialog-cancel");
      const messageDialogConfirm = document.querySelector("#message-dialog-confirm");
      const pageContents = document.querySelectorAll(".page-content");
      const navigationItems = document.querySelectorAll("[data-nav-target]");
      const workLogForm = document.querySelector("#work-log-form");
      const dateInput = document.querySelector("#date");
      const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
      const workLogFieldMap = {
        assignedWork: "assigned_work",
        completedWork: "completed_work",
        unfinishedWork: "unfinished_work",
        learning: "learning",
        tomorrowPlan: "tomorrow_plan"
      };
      const workLogSelect = "*, author_uuid:user_id";
      const USER_CACHE_KEY = "work-log-user";
      const PAGE_SLIDE_DURATION = 500;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let pageTransitionTimeout;
      let pageTransitionFrame;
      let currentUser = null;
      let currentUsername = "";
      let currentAvatarUrl = null;
      let workLogs = [];
      let selectedReport = null;
      let editingLogId = null;
      let isUpdatingPassword = false;
      let isCompletingSignup = false;
      let authSuccessToastTimeout;
      let resolveMessageDialog = null;
      let messageDialogQueue = Promise.resolve();
      const cachedUser = readCachedUser();

      if (cachedUser) {
        userDisplay.textContent = cachedUser.username;
      }

      function readCachedUser() {
        try {
          const cachedValue = localStorage.getItem(USER_CACHE_KEY);
          if (!cachedValue) {
            return null;
          }
          const user = JSON.parse(cachedValue);
          if (typeof user.email !== "string" || typeof user.username !== "string" ||
              !user.email.trim() || !user.username.trim()) {
            localStorage.removeItem(USER_CACHE_KEY);
            return null;
          }
          return { email: user.email, username: user.username };
        } catch (error) {
          console.warn("Unable to read cached user information.", error);
          return null;
        }
      }

      function cacheUser(user, username) {
        if (!user?.email || !username) {
          return;
        }
        try {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify({
            email: user.email,
            username
          }));
        } catch (error) {
          console.warn("Unable to cache user information.", error);
        }
      }

      function clearCachedUser() {
        try {
          localStorage.removeItem(USER_CACHE_KEY);
        } catch (error) {
          console.warn("Unable to clear cached user information.", error);
        }
      }

      function closeMessageDialog(result) {
        const resolve = resolveMessageDialog;
        resolveMessageDialog = null;
        messageDialog.close();
        resolve?.(result);
      }

      function showMessage(message, needsConfirmation = false) {
        const pendingMessage = messageDialogQueue.then(() => new Promise((resolve) => {
          messageDialogText.textContent = message;
          messageDialogCancel.hidden = !needsConfirmation;
          resolveMessageDialog = resolve;
          messageDialog.showModal();
        }));
        messageDialogQueue = pendingMessage.then(() => undefined, () => undefined);
        return pendingMessage;
      }

      messageDialogCancel.addEventListener("click", () => closeMessageDialog(false));
      messageDialogConfirm.addEventListener("click", () => closeMessageDialog(true));
      messageDialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeMessageDialog(false);
      });

      function closeProfileDropdown() {
        userProfileContainer.classList.remove("is-open");
        userProfileContainer.classList.remove("has-focus");
        userProfileContainer.classList.remove("is-hovered");
        userProfileTrigger.setAttribute("aria-expanded", "false");
        if (userProfileContainer.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }

      function setProfileDropdownOpen(isOpen) {
        userProfileTrigger.setAttribute("aria-expanded", String(isOpen));
      }

      function renderUserAvatar(avatarUrl) {
        const image = userProfileTrigger.querySelector(".user-avatar img");
        image.onerror = () => {
          if (image.src === DEFAULT_AVATAR_SRC || currentAvatarUrl !== avatarUrl) {
            return;
          }
          image.src = DEFAULT_AVATAR_SRC;
          void showMessage("프로필 사진을 불러오지 못했습니다. 저장된 이미지 URL과 파일을 확인해 주세요.");
        };
        image.src = avatarUrl || DEFAULT_AVATAR_SRC;
      }

      function toWorkLog(row, userProfile) {
        const log = {
          ...row,
          users: userProfile ? { username: userProfile.username } : null
        };
        Object.entries(workLogFieldMap).forEach(([formField, databaseField]) => {
          log[formField] = row[databaseField] ?? "";
          if (databaseField !== formField) {
            delete log[databaseField];
          }
        });
        return log;
      }

      function toDatabaseWorkLog(log) {
        const row = {
          author: currentUser.id,
          user_id: currentUser.id,
          date: log.date || null,
          status: log.status || "진행 중"
        };
        Object.entries(workLogFieldMap).forEach(([formField, databaseField]) => {
          row[databaseField] = log[formField] || "";
        });
        return row;
      }

      async function attachWorkLogUsers(rows) {
        const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
        let profilesByUserId = new Map();

        if (userIds.length > 0) {
          const { data: profiles, error } = await supabaseClient
            .from("users")
            .select("user_id, username")
            .in("user_id", userIds);
          if (error) {
            throw error;
          }
          profilesByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
        }

        return rows.map((row) => toWorkLog(row, profilesByUserId.get(row.user_id)));
      }

      async function loadWorkLogs() {
        const { data, error } = await supabaseClient
          .from("work_logs")
          .select(workLogSelect)
          .order("date", { ascending: false });
        if (error) {
          throw error;
        }
        return attachWorkLogUsers(data);
      }

      async function refreshWorkLogs() {
        workLogs = await loadWorkLogs();
        renderTable(workLogs);
        return workLogs;
      }

      function getToday() {
        const today = new Date();
        return [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0")
        ].join("-");
      }

      function getWorkLogData() {
        return Object.fromEntries(new FormData(workLogForm).entries());
      }

      async function getAuthenticatedUser() {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
          throw error;
        }
        if (!user) {
          throw new Error("로그인한 사용자를 확인할 수 없습니다.");
        }
        return user;
      }

      async function loadOrCreateUserProfile(user) {
        const { data: existingProfile, error } = await supabaseClient
          .from("users")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }
        if (existingProfile) {
          return existingProfile;
        }

        const defaultUsername = user.email?.split("@")[0] || "user";
        const { error: insertError } = await supabaseClient
          .from("users")
          .insert({ user_id: user.id, username: defaultUsername, avatar_url: null });
        if (insertError) {
          throw insertError;
        }
        return {
          user_id: user.id,
          username: defaultUsername,
          avatar_url: null
        };
      }

      function showUsernameError(message) {
        nicknameError.textContent = message;
        nicknameError.hidden = !message;
      }

      function renderReportPage(log) {
        const previewCard = document.querySelector("#report-preview-card");
        previewCard.replaceChildren();

        if (!log) {
          const emptyMessage = document.createElement("p");
          emptyMessage.textContent = "표시할 업무일지가 없습니다. / 暂无可显示的工作日志。";
          previewCard.append(emptyMessage);
          selectedReport = null;
          return;
        }

        selectedReport = log;

        const brand = document.createElement("p");
        brand.className = "report-brand";
        brand.textContent = "BNC AX JUNIOR LAB";
        const title = document.createElement("h2");
        title.className = "report-document-title";
        title.textContent = "일일 업무보고서";

        const meta = document.createElement("div");
        meta.className = "report-meta";
        [
          ["작성자", log.users?.username || "未知用户"],
          ["작성일", log.date],
          ["상태", log.status]
        ].forEach(([label, value]) => {
          const item = document.createElement("div");
          item.className = "report-meta-item";
          const itemLabel = document.createElement("strong");
          itemLabel.textContent = label;
          const itemValue = document.createElement("span");
          itemValue.textContent = value || "—";
          item.append(itemLabel, itemValue);
          meta.append(item);
        });

        const divider = document.createElement("hr");
        divider.className = "report-divider";
        const workList = document.createElement("ol");
        workList.className = "report-work-list";
        [
          ["지시받은 업무", log.assignedWork],
          ["오늘 완료한 업무", log.completedWork],
          ["미완료 업무 및 문제점", log.unfinishedWork],
          ["오늘 배운 내용", log.learning],
          ["내일 할 일", log.tomorrowPlan]
        ].forEach(([label, value]) => {
          const item = document.createElement("li");
          item.append(document.createTextNode(label));
          const content = document.createElement("p");
          content.textContent = value || "—";
          item.append(content);
          workList.append(item);
        });

        previewCard.append(brand, title, meta, divider, workList);
      }

      async function exportPDF() {
        if (typeof window.html2canvas !== "function" || typeof window.jspdf?.jsPDF !== "function") {
          throw new Error("PDF 내보내기 라이브러리를 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.");
        }

        const reportContent = document.querySelector("#report-content");
        const bounds = reportContent.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) {
          throw new Error("보고서 화면이 표시되지 않아 PDF를 만들 수 없습니다.");
        }

        await document.fonts.ready;

        const scale = Math.min(
          2,
          8192 / Math.max(bounds.width, bounds.height),
          Math.sqrt(12000000 / (bounds.width * bounds.height))
        );
        let canvas;

        try {
          canvas = await window.html2canvas(reportContent, {
            allowTaint: false,
            backgroundColor: null,
            logging: false,
            scale,
            useCORS: true,
            windowWidth: 1024,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDocument) => {
              const clonedContent = clonedDocument.querySelector("#report-content");
              clonedContent.style.background = getComputedStyle(document.querySelector("#page-report")).background;
              clonedContent.style.display = "block";
              clonedContent.style.width = "794px";
              clonedContent.style.minHeight = "0";
              clonedContent.style.height = "auto";
              clonedContent.style.margin = "0";
              clonedContent.style.padding = "24px";
              clonedContent.style.boxSizing = "border-box";
              clonedContent.querySelector(".report-actions")?.remove();
            }
          });

          if (canvas.width === 0 || canvas.height === 0) {
            throw new Error("보고서 내용을 이미지로 변환하지 못했습니다.");
          }

          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
          });
          const pageWidthMm = 210;
          const pageHeightMm = 297;
          const pageHeightPx = Math.floor(canvas.width * pageHeightMm / pageWidthMm);
          const pageCount = Math.ceil(canvas.height / pageHeightPx);

          for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
            const sourceY = pageIndex * pageHeightPx;
            const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY);
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;

            try {
              const context = pageCanvas.getContext("2d");
              if (!context) {
                throw new Error("PDF 페이지를 준비하지 못했습니다.");
              }
              context.drawImage(
                canvas,
                0,
                sourceY,
                canvas.width,
                sliceHeight,
                0,
                0,
                canvas.width,
                sliceHeight
              );

              if (pageIndex > 0) {
                pdf.addPage("a4", "portrait");
              }
              const imageHeightMm = sliceHeight * pageWidthMm / canvas.width;
              pdf.addImage(
                pageCanvas.toDataURL("image/jpeg", 0.95),
                "JPEG",
                0,
                0,
                pageWidthMm,
                imageHeightMm,
                undefined,
                "FAST"
              );
            } finally {
              pageCanvas.width = 0;
              pageCanvas.height = 0;
            }
          }

          await pdf.save("업무보고서.pdf");
        } finally {
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
      }

      function getStatusPresentation(status) {
        if (status === "완료" || status === "已完成") {
          return { label: "완료 / 已完成", className: "status--complete" };
        }
        if (status === "진행 중" || status === "进行中") {
          return { label: "진행 중 / 进行中", className: "status--progress" };
        }
        return { label: "대기 / 待处理", className: "status--waiting" };
      }

      function createLogRow(log) {
        const row = document.createElement("tr");
        row.dataset.logId = String(log.id);

        const dateCell = document.createElement("td");
        dateCell.textContent = String(log.date || "").replaceAll("-", ".") || "—";
        const authorCell = document.createElement("td");
        authorCell.textContent = log.users?.username || "未知用户";
        const workCell = document.createElement("td");
        workCell.textContent = log.completedWork || log.assignedWork || "—";
        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        const statusPresentation = getStatusPresentation(log.status);
        status.className = `status ${statusPresentation.className}`;
        status.textContent = statusPresentation.label;
        statusCell.append(status);

        const actionsCell = document.createElement("td");
        const viewButton = document.createElement("button");
        viewButton.className = "view-link";
        viewButton.type = "button";
        viewButton.dataset.viewLog = String(log.id);
        viewButton.textContent = "보기";
        const deleteButton = document.createElement("button");
        deleteButton.className = "btn-delete";
        deleteButton.type = "button";
        deleteButton.dataset.id = String(log.id);
        deleteButton.textContent = "삭제";
        actionsCell.append(viewButton, deleteButton);

        row.append(dateCell, authorCell, workCell, statusCell, actionsCell);
        return row;
      }

      function renderTable(logs = workLogs) {
        document.querySelectorAll("[data-log-table]").forEach((tableBody) => {
          const rows = logs.map(createLogRow);
          tableBody.replaceChildren(...rows);

          if (rows.length === 0) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");
            emptyCell.colSpan = 5;
            emptyCell.textContent = "업무일지가 없습니다 / 暂无工作日志";
            emptyRow.append(emptyCell);
            tableBody.append(emptyRow);
          }
        });

        document.querySelector('[data-summary="total"]').textContent = logs.length;
        document.querySelector('[data-summary="complete"]').textContent =
          logs.filter((log) => log.status === "완료" || log.status === "已完成").length;
        document.querySelector('[data-summary="progress"]').textContent =
          logs.filter((log) => log.status === "진행 중" || log.status === "进行中").length;
      }

      function switchPage(pageId) {
        const targetPage = document.getElementById(pageId);
        if (!targetPage || !targetPage.classList.contains("page-content")) {
          console.error(`Unknown page: ${pageId}`);
          return;
        }

        finishPageTransition();
        const currentPage = document.querySelector(".page-content.is-active");
        renderTable(workLogs);

        const currentPageIndex = Array.from(navigationItems).findIndex(
          (item) => item.dataset.navTarget === currentPage?.id
        );
        const targetPageIndex = Array.from(navigationItems).findIndex(
          (item) => item.dataset.navTarget === pageId
        );
        const shouldSlide =
          currentPage &&
          currentPage !== targetPage &&
          currentPageIndex !== -1 &&
          targetPageIndex !== -1 &&
          !prefersReducedMotion.matches;

        if (shouldSlide) {
          const movingUp = targetPageIndex < currentPageIndex;
          const enteringClass = movingUp
            ? "is-entering-from-top"
            : "is-entering-from-bottom";
          const leavingClass = movingUp
            ? "is-leaving-to-bottom"
            : "is-leaving-to-top";

          currentPage.classList.remove("is-active");
          currentPage.classList.add("is-transitioning");
          targetPage.classList.add("is-active", "is-transitioning", enteringClass);

          pageTransitionFrame = window.requestAnimationFrame(() => {
            pageTransitionFrame = window.requestAnimationFrame(() => {
              pageTransitionFrame = undefined;
              targetPage.classList.remove(enteringClass);
              currentPage.classList.add(leavingClass);
            });
          });
          pageTransitionTimeout = window.setTimeout(
            finishPageTransition,
            PAGE_SLIDE_DURATION + 50
          );
        } else {
          pageContents.forEach((page) => page.classList.remove("is-active"));
          targetPage.classList.add("is-active");
        }

        navigationItems.forEach((item) => {
          if (item.dataset.navTarget === pageId) {
            item.setAttribute("aria-current", "page");
          } else {
            item.removeAttribute("aria-current");
          }
        });

        if (pageId === "page-report") {
          renderReportPage(workLogs[0] || null);
        }

        const title = targetPage.querySelector(".page-title")?.textContent.trim();
        if (title) {
          document.title = `${title} · 업무일지`;
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function finishPageTransition() {
        window.clearTimeout(pageTransitionTimeout);
        window.cancelAnimationFrame(pageTransitionFrame);
        pageTransitionTimeout = undefined;
        pageTransitionFrame = undefined;
        pageContents.forEach((page) => {
          page.classList.remove(
            "is-transitioning",
            "is-entering-from-top",
            "is-entering-from-bottom",
            "is-leaving-to-top",
            "is-leaving-to-bottom"
          );
        });
      }

      document.querySelectorAll("[data-nav-target]").forEach((item) => {
        item.addEventListener("click", (event) => {
          event.preventDefault();
          switchPage(item.dataset.navTarget);
        });
      });

      document.querySelectorAll("[data-page-target]").forEach((item) => {
        item.addEventListener("click", (event) => {
          event.preventDefault();
          switchPage(item.dataset.pageTarget);
        });
      });

      dateInput.value = getToday();
      dateInput.defaultValue = dateInput.value;

      workLogForm.addEventListener("reset", () => {
        window.setTimeout(() => {
          dateInput.value = getToday();
        }, 0);
      });

      function showAuthError(message) {
        authError.textContent = message;
        authError.hidden = !message;
      }

      function showAuthSuccess(message) {
        window.clearTimeout(authSuccessToastTimeout);
        authSuccessToast.textContent = message;
        authSuccessToast.hidden = false;
        authSuccessToastTimeout = window.setTimeout(() => {
          authSuccessToast.hidden = true;
        }, 3000);
      }

      function getAuthValidationMessage() {
        const emailInput = document.querySelector("#auth-email");
        const passwordInput = document.querySelector("#auth-password");
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email) {
          emailInput.focus();
          return "이메일을 입력해 주세요.";
        }
        if (!emailInput.checkValidity()) {
          emailInput.focus();
          return "올바른 이메일 주소를 입력해 주세요.";
        }
        if (!password) {
          passwordInput.focus();
          return "비밀번호를 입력해 주세요.";
        }
        if (password.length < 6) {
          passwordInput.focus();
          return "비밀번호는 6자 이상 입력해 주세요.";
        }
        return "";
      }

      function slideOutAuthScreen() {
        authScreen.classList.remove("animate-in");
        authScreen.classList.add("slide-out-left");
      }

      function slideInMainApp() {
        authScreen.hidden = true;
        authScreen.classList.remove("slide-out-left");
        mainApp.hidden = false;
        mainApp.classList.add("slide-in-from-right");

        const finishTransition = () => {
          mainApp.classList.remove("slide-in-from-right");
          document.body.classList.remove("is-page-transitioning");
        };
        mainApp.addEventListener("animationend", finishTransition, { once: true });
        window.setTimeout(finishTransition, PAGE_SLIDE_DURATION + 100);
      }

      // 로그인 성공 시: 로그인 화면이 왼쪽으로 빠져나간 뒤 대시보드가 오른쪽에서 들어옵니다.
      function playLoginTransition() {
        const slideDuration = prefersReducedMotion.matches ? 0 : PAGE_SLIDE_DURATION;
        document.body.classList.add("is-page-transitioning");
        slideOutAuthScreen();
        window.setTimeout(slideInMainApp, slideDuration);
      }

      function resetAuthScreenState() {
        authScreen.hidden = false;
        authScreen.classList.remove("slide-out-left");
        authScreen.classList.add("animate-in");
        mainApp.classList.remove("slide-in-from-right");
        document.body.classList.remove("is-page-transitioning");
      }

      async function applyAuthSession(session) {
        const nextUser = session?.user ?? null;
        if (currentUser?.id !== nextUser?.id) {
          workLogs = [];
          selectedReport = null;
          currentUsername = "";
          currentAvatarUrl = null;
          userDisplay.textContent = "";
          renderUserAvatar(null);
          closeProfileDropdown();
          renderTable(workLogs);
        }
        currentUser = nextUser;
        showAuthError("");

        if (!currentUser) {
          workLogs = [];
          selectedReport = null;
          currentUsername = "";
          currentAvatarUrl = null;
          userDisplay.textContent = "";
          clearCachedUser();
          renderUserAvatar(null);
          mainApp.hidden = true;
          resetAuthScreenState();
          authForm.hidden = false;
          forgotPasswordButton.hidden = false;
          authStatus.textContent = "로그인 후 업무일지를 확인할 수 있습니다.";
          return;
        }

        const cachedProfile = readCachedUser();
        const matchesCachedEmail = cachedProfile &&
          cachedProfile.email.toLowerCase() === currentUser.email?.toLowerCase();
        currentUsername = matchesCachedEmail ? cachedProfile.username : "";
        userDisplay.textContent = currentUsername;
        if (currentUsername) {
          workLogForm.elements.namedItem("author").value = currentUsername;
        }
        if (mainApp.hidden && !authScreen.hidden) {
          playLoginTransition();
        } else {
          authScreen.hidden = true;
          mainApp.hidden = false;
        }
        try {
          currentUser = await getAuthenticatedUser();
          const profile = await loadOrCreateUserProfile(currentUser);
          currentUsername = profile.username || currentUser.email?.split("@")[0] || currentUser.id;
          currentAvatarUrl = profile.avatar_url || null;
          userDisplay.textContent = currentUsername;
          renderUserAvatar(currentAvatarUrl);
          workLogForm.elements.namedItem("author").value = currentUsername;
          cacheUser(currentUser, currentUsername);
          await refreshWorkLogs();
        } catch (error) {
          console.error("Unable to initialize user profile or load work logs from Supabase.", error);
          currentUsername = currentUsername || currentUser.email?.split("@")[0] || currentUser.id;
          userDisplay.textContent = currentUsername;
          renderUserAvatar(currentAvatarUrl);
          workLogForm.elements.namedItem("author").value = currentUsername;
          await showMessage(`사용자 프로필 또는 업무일지를 불러오지 못했습니다: ${error.message}`);
          workLogs = [];
          renderTable([]);
        }
      }

      authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showAuthError("");
        const validationMessage = getAuthValidationMessage();
        if (validationMessage) {
          showAuthError(validationMessage);
          return;
        }
        const submitButton = document.querySelector("#login-button");
        submitButton.disabled = true;
        const { email, password } = Object.fromEntries(new FormData(authForm).entries());
        try {
          const { error } = await supabaseClient.auth.signInWithPassword({
            email: String(email).trim(),
            password: String(password)
          });
          if (error) {
            throw error;
          }
        } catch (error) {
          console.error("Supabase sign-in failed.", error);
          showAuthError(error.message);
        } finally {
          submitButton.disabled = false;
        }
      });

      forgotPasswordButton.addEventListener("click", () => {
        resetEmailError.textContent = "";
        resetEmailError.hidden = true;
        resetEmailInput.value = document.querySelector("#auth-email").value.trim();
        resetEmailDialog.showModal();
        resetEmailInput.focus();
      });

      document.querySelector("#cancel-reset-email").addEventListener("click", () => {
        resetEmailDialog.close();
      });

      resetEmailForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        resetEmailError.textContent = "";
        resetEmailError.hidden = true;
        if (!resetEmailForm.reportValidity()) {
          return;
        }

        sendResetEmailButton.disabled = true;
        try {
          const redirectTo = new URL("./reset-password.html", window.location.href).href;
          const { error } = await supabaseClient.auth.resetPasswordForEmail(
            resetEmailInput.value.trim(),
            { redirectTo }
          );
          if (error) {
            throw error;
          }

          resetEmailDialog.close();
          showAuthSuccess("비밀번호 재설정 링크를 발송했습니다.");
        } catch (error) {
          console.error("Supabase password reset email request failed.", error);
          resetEmailError.textContent = "비밀번호 재설정 링크를 보내지 못했습니다. 이메일 주소를 확인하고 다시 시도해 주세요.";
          resetEmailError.hidden = false;
        } finally {
          sendResetEmailButton.disabled = false;
        }
      });

      document.querySelector("#signup-button").addEventListener("click", async () => {
        showAuthError("");
        const validationMessage = getAuthValidationMessage();
        if (validationMessage) {
          showAuthError(validationMessage);
          return;
        }
        const email = document.querySelector("#auth-email").value.trim();
        const password = document.querySelector("#auth-password").value;

        const signupButton = document.querySelector("#signup-button");
        signupButton.disabled = true;
        isCompletingSignup = true;
        try {
          const { data, error } = await supabaseClient.auth.signUp({ email, password });
          if (error) {
            throw error;
          }
          if (data.session) {
            const { error: signOutError } = await supabaseClient.auth.signOut({ scope: "local" });
            if (signOutError) {
              throw new Error(`계정은 생성되었지만 로그인 화면으로 이동하지 못했습니다: ${signOutError.message}`);
            }
            await applyAuthSession(null);
          }
          showAuthError("");
          document.querySelector("#auth-password").value = "";
          authStatus.textContent = data.session
            ? "계정 생성이 완료되었습니다. 로그인해 주세요."
            : "계정 생성이 완료되었습니다. 이메일을 확인한 뒤 로그인해 주세요.";
          showAuthSuccess("회원가입이 성공하였습니다.");
        } catch (error) {
          console.error("Supabase sign-up failed.", error);
          showAuthError(error.message);
        } finally {
          isCompletingSignup = false;
          signupButton.disabled = false;
        }
      });

      function closeNicknameModal() {
        nicknameModalOverlay.style.display = "none";
      }

      function closePasswordModal() {
        passwordModalOverlay.style.display = "none";
      }

      function showPasswordError(message) {
        passwordError.textContent = message;
        passwordError.hidden = !message;
      }

      userProfileTrigger.addEventListener("click", () => {
        const isOpen = !userProfileContainer.classList.contains("is-open");
        userProfileContainer.classList.toggle("is-open", isOpen);
        userProfileContainer.classList.toggle("has-focus", isOpen);
        setProfileDropdownOpen(isOpen);
      });

      userProfileContainer.addEventListener("mouseenter", () => {
        userProfileContainer.classList.add("is-hovered");
        setProfileDropdownOpen(true);
      });

      userProfileContainer.addEventListener("mouseleave", () => {
        userProfileContainer.classList.remove("is-hovered");
        if (!userProfileContainer.classList.contains("is-open") &&
            !userProfileContainer.classList.contains("has-focus")) {
          setProfileDropdownOpen(false);
        }
      });

      userProfileContainer.addEventListener("focusin", () => {
        userProfileContainer.classList.add("has-focus");
        setProfileDropdownOpen(true);
      });

      userProfileContainer.addEventListener("focusout", (event) => {
        if (!userProfileContainer.contains(event.relatedTarget) &&
            !userProfileContainer.classList.contains("is-open")) {
          userProfileContainer.classList.remove("has-focus");
          setProfileDropdownOpen(false);
        }
      });

      document.addEventListener("click", (event) => {
        if (!userProfileContainer.contains(event.target)) {
          closeProfileDropdown();
        }
      });

      document.querySelector("#btnChangeUsername").addEventListener("click", () => {
        closeProfileDropdown();
        showUsernameError("");
        nicknameInput.value = currentUsername;
        nicknameModalOverlay.style.display = "flex";
        nicknameInput.focus();
      });

      document.querySelector("#btnChangeAvatar").addEventListener("click", () => {
        closeProfileDropdown();
        avatarFileInput.click();
      });

      document.querySelector("#btnChangePassword").addEventListener("click", () => {
        closeProfileDropdown();
        showPasswordError("");
        passwordForm.reset();
        passwordModalOverlay.style.display = "flex";
        passwordForm.elements.namedItem("currentPassword").focus();
      });

      document.querySelector("#closePasswordBtn").addEventListener("click", closePasswordModal);

      passwordModalOverlay.addEventListener("click", (event) => {
        if (event.target === passwordModalOverlay) {
          closePasswordModal();
        }
      });

      passwordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showPasswordError("");
        const { currentPassword, newPassword, confirmPassword } =
          Object.fromEntries(new FormData(passwordForm).entries());
        if (newPassword !== confirmPassword) {
          showPasswordError("새 비밀번호가 일치하지 않습니다.");
          return;
        }
        if (newPassword === currentPassword) {
          showPasswordError("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
          return;
        }
        if (!currentUser?.email) {
          showPasswordError("이 계정은 이메일 비밀번호 인증을 사용할 수 없습니다.");
          return;
        }

        savePasswordBtn.disabled = true;
        isUpdatingPassword = true;
        try {
          const { error: verificationError } = await supabaseClient.auth.signInWithPassword({
            email: currentUser.email,
            password: String(currentPassword)
          });
          if (verificationError) {
            throw verificationError;
          }

          const { error: updateError } = await supabaseClient.auth.updateUser({
            password: String(newPassword)
          });
          if (updateError) {
            throw updateError;
          }

          passwordForm.reset();
          closePasswordModal();
          await showMessage("비밀번호가 변경되었습니다.");
        } catch (error) {
          console.error("Unable to update the password.", error);
          showPasswordError(`비밀번호를 변경하지 못했습니다: ${error.message}`);
        } finally {
          isUpdatingPassword = false;
          savePasswordBtn.disabled = false;
        }
      });

      avatarFileInput.addEventListener("change", async () => {
        const [file] = avatarFileInput.files;
        if (!file) {
          return;
        }
        avatarFileInput.value = "";

        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
          await showMessage("JPG, PNG, WebP 또는 GIF 이미지 파일을 선택해 주세요.");
          return;
        }
        if (file.size > MAX_AVATAR_SIZE) {
          await showMessage("프로필 사진은 5MB 이하로 업로드해 주세요.");
          return;
        }

        const avatarButton = document.querySelector("#btnChangeAvatar");
        avatarButton.disabled = true;
        try {
          const user = await getAuthenticatedUser();
          const extensionByType = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif"
          };
          const objectPath = `${user.id}/${Date.now()}.${extensionByType[file.type]}`;
          const { error: uploadError } = await supabaseClient.storage
            .from("avatars")
            .upload(objectPath, file, {
              cacheControl: "3600",
              contentType: file.type,
              upsert: true
            });
          if (uploadError) {
            throw uploadError;
          }

          const { data: publicUrlData } = supabaseClient.storage
            .from("avatars")
            .getPublicUrl(objectPath);
          const avatarUrl = publicUrlData.publicUrl;
          if (!avatarUrl) {
            throw new Error("프로필 사진 URL을 생성하지 못했습니다.");
          }

          const { data: updatedProfile, error: profileError } = await supabaseClient
            .from("users")
            .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .select("user_id, avatar_url")
            .maybeSingle();
          if (profileError) {
            throw profileError;
          }
          if (!updatedProfile) {
            throw new Error("사용자 프로필을 찾을 수 없습니다.");
          }
          if (updatedProfile.avatar_url !== avatarUrl) {
            throw new Error("프로필 사진 URL이 사용자 프로필에 저장되지 않았습니다.");
          }

          currentAvatarUrl = updatedProfile.avatar_url;
          renderUserAvatar(currentAvatarUrl);
          await showMessage("프로필 사진이 변경되었습니다.");
        } catch (error) {
          console.error("Unable to upload the profile photo.", error);
          await showMessage(`프로필 사진을 변경하지 못했습니다: ${error.message}`);
        } finally {
          avatarButton.disabled = false;
        }
      });

      closeNicknameBtn.addEventListener("click", closeNicknameModal);

      nicknameModalOverlay.addEventListener("click", (event) => {
        if (event.target === nicknameModalOverlay) {
          closeNicknameModal();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nicknameModalOverlay.style.display === "flex") {
          closeNicknameModal();
        }
        if (event.key === "Escape" && passwordModalOverlay.style.display === "flex") {
          closePasswordModal();
        }
        if (event.key === "Escape") {
          closeProfileDropdown();
        }
      });

      nicknameForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showUsernameError("");
        const newUsername = nicknameInput.value.trim();
        if (!newUsername || newUsername.length > 50) {
          showUsernameError("이름은 1자 이상 50자 이하여야 합니다.");
          return;
        }

        saveNicknameBtn.disabled = true;
        try {
          const supabase = supabaseClient;
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            throw userError;
          }
          if (!user) {
            throw new Error("로그인한 사용자를 확인할 수 없습니다.");
          }

          const { error } = await supabase
            .from("users")
            .upsert(
              {
                user_id: user.id,
                username: newUsername,
                avatar_url: currentAvatarUrl,
                updated_at: new Date().toISOString()
              },
              { onConflict: "user_id" }
            );
          if (error) {
            throw error;
          }

          currentUsername = newUsername;
          userDisplay.textContent = newUsername;
          workLogForm.elements.namedItem("author").value = currentUsername;
          cacheUser(user, currentUsername);
          workLogs = workLogs.map((log) => ({
            ...log,
            users: log.author_uuid === currentUser.id ? { username: currentUsername } : log.users
          }));
          renderTable(workLogs);
          if (selectedReport?.author_uuid === currentUser.id) {
            selectedReport = { ...selectedReport, users: { username: currentUsername } };
            renderReportPage(selectedReport);
          }
          closeNicknameModal();
          await showMessage("닉네임이 저장되었습니다!");
        } catch (error) {
          console.error("Unable to update username.", error);
          showUsernameError(`이름을 저장하지 못했습니다: ${error.message}`);
        } finally {
          saveNicknameBtn.disabled = false;
        }
      });

      document.querySelector("#btnLogout").addEventListener("click", async () => {
        closeProfileDropdown();
        try {
          const { error } = await supabaseClient.auth.signOut();
          if (error) {
            throw error;
          }
          await applyAuthSession(null);
        } catch (error) {
          console.error("Supabase sign-out failed.", error);
          await showMessage(`로그아웃하지 못했습니다: ${error.message}`);
        }
      });

      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (isUpdatingPassword || (isCompletingSignup && event === "SIGNED_IN")) {
          return;
        }
        window.setTimeout(() => {
          void applyAuthSession(session);
        }, 0);
      });

      document.addEventListener("click", async (event) => {
        const deleteButton = event.target.closest(".btn-delete");
        if (deleteButton) {
          event.preventDefault();
          if (!(await showMessage("정말 삭제하시겠습니까?", true))) {
            return;
          }

          const logId = deleteButton.dataset.id;
          if (!workLogs.some((log) => String(log.id) === logId)) {
            console.error(`No work log found for ID: ${logId}`);
            return;
          }

          try {
            const { error } = await supabaseClient
              .from("work_logs")
              .delete()
              .eq("id", logId);
            if (error) {
              throw error;
            }
            await refreshWorkLogs();
          } catch (error) {
            console.error("Unable to delete work log.", error);
            await showMessage(`업무일지를 삭제하지 못했습니다: ${error.message}`);
            return;
          }
          return;
        }

        const viewButton = event.target.closest("[data-view-log]");
        if (viewButton) {
          const log = workLogs.find((item) => String(item.id) === viewButton.dataset.viewLog);
          if (log) {
            switchPage("page-report");
            renderReportPage(log);
          }
        }
      });

      document.querySelector("#save-demo-button").addEventListener("click", async (event) => {
        if (!currentUser) {
          await showMessage("업무일지를 저장하려면 먼저 로그인해 주세요.");
          return;
        }

        const saveButton = event.currentTarget;
        saveButton.disabled = true;
        try {
          const payload = toDatabaseWorkLog(getWorkLogData());
          const isEditing = editingLogId !== null;
          const { data, error } = isEditing
            ? await supabaseClient
                .from("work_logs")
                .update(payload)
                .eq("id", editingLogId)
                .select(workLogSelect)
                .single()
            : await supabaseClient
                .from("work_logs")
                .insert(payload)
                .select(workLogSelect)
                .single();
          if (error) {
            throw error;
          }

          const [savedLog] = await attachWorkLogUsers([data]);
          editingLogId = null;
          try {
            await refreshWorkLogs();
          } catch (refreshError) {
            console.error("Work log was saved, but the list could not be refreshed.", refreshError);
            await showMessage(`저장했지만 목록을 새로고침하지 못했습니다: ${refreshError.message}`);
          }
          await showMessage("저장되었습니다!");
          switchPage("page-report");
          renderReportPage(savedLog);
        } catch (error) {
          console.error("Unable to save work log to Supabase.", error);
          await showMessage(`업무일지를 저장하지 못했습니다: ${error.message}`);
        } finally {
          saveButton.disabled = false;
        }
      });

      document.querySelector("#preview-button").addEventListener("click", () => {
        const previewData = getWorkLogData();
        if (editingLogId !== null) {
          previewData.id = editingLogId;
        }
        switchPage("page-report");
        renderReportPage(previewData);
      });

      document.querySelector("#cancel-button").addEventListener("click", () => {
        switchPage("page-dashboard");
      });

      const exportPdfButton = document.querySelector("#export-pdf-button");
      exportPdfButton.addEventListener("click", async () => {
        if (!selectedReport || selectedReport.id === undefined) {
          await showMessage("내보낼 업무 일지를 찾을 수 없습니다.");
          return;
        }

        exportPdfButton.disabled = true;
        try {
          const { data, error } = await supabaseClient
            .from("work_logs")
            .update({ status: "완료" })
            .eq("id", selectedReport.id)
            .select(workLogSelect)
            .maybeSingle();
          if (error) {
            throw error;
          }
          if (!data) {
            await showMessage("내보낼 수 있는 업무 일지가 없습니다. 먼저 편집 페이지에서 작성을 완료하고 저장해 주세요.");
            return;
          }

          [selectedReport] = await attachWorkLogUsers([data]);
          await refreshWorkLogs();
          renderReportPage(selectedReport);
          await exportPDF();
        } catch (error) {
          console.error("Unable to complete or export the work log.", error);
          await showMessage(`업무일지 완료 처리 또는 PDF 내보내기에 실패했습니다: ${error.message}`);
        } finally {
          exportPdfButton.disabled = false;
        }
      });

      document.querySelector("#edit-report-button").addEventListener("click", () => {
        if (!selectedReport) {
          switchPage("page-editor");
          return;
        }

        editingLogId = selectedReport.id ?? null;
        Object.entries(selectedReport).forEach(([name, value]) => {
          const field = workLogForm.elements.namedItem(name);
          if (field && typeof value === "string") {
            field.value = value;
          }
        });
        switchPage("page-editor");
      });

      document.querySelector("#report-list-button").addEventListener("click", () => {
        switchPage("page-dashboard");
      });

      renderTable();
