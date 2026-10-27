const SUPABASE_URL = "https://hdwkxlynuyunggrgvkvu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XiDSi6k6FDHr9D56c1a7TA_eQidQJ7w";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const authScreen = document.querySelector("#auth-screen");
      const authForm = document.querySelector("#auth-form");
      const authStatus = document.querySelector("#auth-status");
      const authError = document.querySelector("#auth-error");
      const mainApp = document.querySelector("#main-app");
      const userDisplay = document.querySelector("#userDisplay");
      const nicknameModalOverlay = document.querySelector("#nicknameModalOverlay");
      const nicknameInput = document.querySelector("#nicknameInput");
      const saveNicknameBtn = document.querySelector("#saveNicknameBtn");
      const closeNicknameBtn = document.querySelector("#closeNicknameBtn");
      const nicknameForm = document.querySelector("#nickname-form");
      const nicknameError = document.querySelector("#nickname-error");
      const userProfileTrigger = document.querySelector("#user-profile-trigger");
      const pageContents = document.querySelectorAll(".page-content");
      const navigationItems = document.querySelectorAll("[data-nav-target]");
      const workLogForm = document.querySelector("#work-log-form");
      const dateInput = document.querySelector("#date");
      const workLogFieldMap = {
        assignedWork: "assigned_work",
        completedWork: "completed_work",
        unfinishedWork: "unfinished_work",
        learning: "learning",
        tomorrowPlan: "tomorrow_plan"
      };
      let currentUser = null;
      let currentUsername = "";
      let workLogs = [];
      let selectedReport = null;
      let editingLogId = null;

      function toWorkLog(row) {
        const log = { ...row };
        if (row.author === currentUser?.id) {
          log.author = currentUsername || currentUser.email || row.author;
        }
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

      async function loadWorkLogs() {
        const { data, error } = await supabaseClient
          .from("work_logs")
          .select("*")
          .order("date", { ascending: false });
        if (error) {
          throw error;
        }
        return data.map(toWorkLog);
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

      async function loadOrCreateUserProfile() {
        const user = await getAuthenticatedUser();
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
          ["작성자", log.author],
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
        authorCell.textContent = log.author || "—";
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

        renderTable(workLogs);
        pageContents.forEach((page) => page.classList.remove("is-active"));
        targetPage.classList.add("is-active");

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

      async function applyAuthSession(session) {
        const nextUser = session?.user ?? null;
        if (currentUser?.id !== nextUser?.id) {
          workLogs = [];
          selectedReport = null;
          currentUsername = "";
          userDisplay.textContent = "";
          renderTable(workLogs);
        }
        currentUser = nextUser;
        showAuthError("");

        if (!currentUser) {
          workLogs = [];
          selectedReport = null;
          currentUsername = "";
          userDisplay.textContent = "";
          mainApp.hidden = true;
          authScreen.hidden = false;
          authForm.hidden = false;
          authStatus.textContent = "로그인 후 업무일지를 확인할 수 있습니다.";
          return;
        }

        authScreen.hidden = true;
        mainApp.hidden = false;
        try {
          const profile = await loadOrCreateUserProfile();
          currentUsername = profile.username;
          userDisplay.textContent = currentUsername;
          workLogForm.elements.namedItem("author").value = currentUsername;
          await refreshWorkLogs();
          switchPage("page-dashboard");
        } catch (error) {
          console.error("Unable to initialize user profile or load work logs from Supabase.", error);
          currentUsername = currentUser.email?.split("@")[0] || currentUser.id;
          userDisplay.textContent = currentUsername;
          workLogForm.elements.namedItem("author").value = currentUsername;
          alert(`사용자 프로필 또는 업무일지를 불러오지 못했습니다: ${error.message}`);
          workLogs = [];
          renderTable([]);
        }
      }

      authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showAuthError("");
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

      document.querySelector("#signup-button").addEventListener("click", async () => {
        showAuthError("");
        const email = document.querySelector("#auth-email").value.trim();
        const password = document.querySelector("#auth-password").value;
        if (!authForm.reportValidity()) {
          return;
        }

        const signupButton = document.querySelector("#signup-button");
        signupButton.disabled = true;
        try {
          const { data, error } = await supabaseClient.auth.signUp({ email, password });
          if (error) {
            throw error;
          }
          if (!data.session) {
            authStatus.textContent = "계정 생성 요청이 완료되었습니다. 이메일을 확인한 뒤 로그인해 주세요.";
            showAuthError("");
          }
        } catch (error) {
          console.error("Supabase sign-up failed.", error);
          showAuthError(error.message);
        } finally {
          signupButton.disabled = false;
        }
      });

      function closeNicknameModal() {
        nicknameModalOverlay.style.display = "none";
      }

      userProfileTrigger.addEventListener("click", () => {
        showUsernameError("");
        nicknameInput.value = currentUsername;
        nicknameModalOverlay.style.display = "flex";
        nicknameInput.focus();
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
                avatar_url: null,
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
          workLogs = workLogs.map((log) => ({ ...log, author: currentUsername }));
          renderTable(workLogs);
          if (selectedReport?.author) {
            selectedReport = { ...selectedReport, author: currentUsername };
            renderReportPage(selectedReport);
          }
          closeNicknameModal();
          alert("닉네임이 저장되었습니다! (名称保存成功!)");
        } catch (error) {
          console.error("Unable to update username.", error);
          showUsernameError(`이름을 저장하지 못했습니다: ${error.message}`);
        } finally {
          saveNicknameBtn.disabled = false;
        }
      });

      document.querySelector("#logout-button").addEventListener("click", async () => {
        try {
          const { error } = await supabaseClient.auth.signOut();
          if (error) {
            throw error;
          }
        } catch (error) {
          console.error("Supabase sign-out failed.", error);
          alert(`로그아웃하지 못했습니다: ${error.message}`);
        }
      });

      supabaseClient.auth.onAuthStateChange((event, session) => {
        window.setTimeout(() => {
          void applyAuthSession(session);
        }, 0);
      });

      document.addEventListener("click", async (event) => {
        const deleteButton = event.target.closest(".btn-delete");
        if (deleteButton) {
          event.preventDefault();
          if (!confirm("정말 삭제하시겠습니까?")) {
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
            alert(`업무일지를 삭제하지 못했습니다: ${error.message}`);
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
          alert("업무일지를 저장하려면 먼저 로그인해 주세요.");
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
                .select()
                .single()
            : await supabaseClient
                .from("work_logs")
                .insert(payload)
                .select()
                .single();
          if (error) {
            throw error;
          }

          const savedLog = toWorkLog(data);
          editingLogId = null;
          try {
            await refreshWorkLogs();
          } catch (refreshError) {
            console.error("Work log was saved, but the list could not be refreshed.", refreshError);
            alert(`저장했지만 목록을 새로고침하지 못했습니다: ${refreshError.message}`);
          }
          alert("저장되었습니다! (保存成功!)");
          switchPage("page-report");
          renderReportPage(savedLog);
        } catch (error) {
          console.error("Unable to save work log to Supabase.", error);
          alert(`업무일지를 저장하지 못했습니다: ${error.message}`);
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

      document.querySelector("#print-button").addEventListener("click", async () => {
        if (!selectedReport || selectedReport.id === undefined) {
          alert("내보낼 업무일지를 찾을 수 없습니다. / 找不到要导出的工作日志。");
          return;
        }

        try {
          const { data, error } = await supabaseClient
            .from("work_logs")
            .update({ status: "완료" })
            .eq("id", selectedReport.id)
            .select()
            .single();
          if (error) {
            throw error;
          }

          selectedReport = toWorkLog(data);
          await refreshWorkLogs();
          renderReportPage(selectedReport);
          alert("성공적으로 저장되었습니다! (保存成功!)");
          window.print();
        } catch (error) {
          console.error("Unable to mark the work log as complete.", error);
          alert(`업무일지 상태를 저장하지 못했습니다: ${error.message}`);
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
