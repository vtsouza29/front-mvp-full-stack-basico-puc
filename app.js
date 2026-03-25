const apiBaseUrl = "http://127.0.0.1:8000";
let feedbackTimer = null;

const feedback = document.getElementById("feedback");

const refreshEventsBtn = document.getElementById("refreshEventsBtn");
const eventsGrid = document.getElementById("eventsGrid");

const createEventForm = document.getElementById("createEventForm");
const eventByIdForm = document.getElementById("eventByIdForm");
const eventByIdResult = document.getElementById("eventByIdResult");
const eventLookupInput = document.getElementById("eventIdLookup");

const createSubscriptionForm = document.getElementById("createSubscriptionForm");
const eventSubscriptionsForm = document.getElementById("eventSubscriptionsForm");
const subscriptionsList = document.getElementById("subscriptionsList");

const cancelSubscriptionForm = document.getElementById("cancelSubscriptionForm");
const refreshParticipantsBtn = document.getElementById("refreshParticipantsBtn");
const participantsList = document.getElementById("participantsList");
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");
const attendeesModal = document.getElementById("attendeesModal");
const attendeesTitle = document.getElementById("attendeesTitle");
const attendeesContent = document.getElementById("attendeesContent");
const attendeesCloseBtn = document.getElementById("attendeesCloseBtn");

function showFeedback(type, message) {
  if (!feedback) {
    return;
  }

  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
  }

  feedback.className = `feedback ${type}`;
  feedback.textContent = message;
  feedbackTimer = setTimeout(() => {
    feedback.className = "feedback hidden";
  }, 3500);
}

function formatDetail(detail) {
  if (!detail) {
    return "Erro na requisição.";
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(" | ");
  }
  return JSON.stringify(detail);
}

function openConfirmDialog(message) {
  if (!confirmModal || !confirmMessage || !confirmCancelBtn || !confirmOkBtn) {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      confirmModal.classList.add("hidden");
      document.body.classList.remove("modal-open");
      confirmCancelBtn.removeEventListener("click", handleCancel);
      confirmOkBtn.removeEventListener("click", handleConfirm);
      confirmModal.removeEventListener("click", handleBackdropClick);
      document.removeEventListener("keydown", handleKeydown);
      resolve(result);
    };

    const handleCancel = () => finish(false);
    const handleConfirm = () => finish(true);
    const handleBackdropClick = (event) => {
      if (event.target === confirmModal) {
        finish(false);
      }
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        finish(false);
      }
    };

    confirmMessage.textContent = message;
    confirmModal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    confirmCancelBtn.addEventListener("click", handleCancel);
    confirmOkBtn.addEventListener("click", handleConfirm);
    confirmModal.addEventListener("click", handleBackdropClick);
    document.addEventListener("keydown", handleKeydown);

    confirmOkBtn.focus();
  });
}

function closeAttendeesModal() {
  if (!attendeesModal) {
    return;
  }
  attendeesModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

async function openAttendeesModal(eventId, eventName) {
  if (!attendeesModal || !attendeesTitle || !attendeesContent) {
    return;
  }

  attendeesTitle.textContent = `Inscritos: ${eventName} (ID ${eventId})`;
  attendeesContent.innerHTML = '<p class="list-item">Carregando inscrições...</p>';
  attendeesModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  try {
    const subscriptions = await apiRequest(`/eventos/${eventId}/inscricoes`);
    renderSubscriptions(subscriptions, attendeesContent);
  } catch (error) {
    attendeesContent.innerHTML = `<p class="list-item">${error.message}</p>`;
    showFeedback("error", error.message);
  }
}

async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (_) {
    throw new Error("Não foi possível conectar com a API.");
  }

  let payload;
  const responseText = await response.text();
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(formatDetail(payload?.detail));
  }

  return payload;
}

function renderEvents(events) {
  if (!events.length) {
    eventsGrid.innerHTML = "<p>Nenhum evento cadastrado.</p>";
    return;
  }

  eventsGrid.innerHTML = events
    .map((event) => {
      const vagasClass = event.vagas_disponiveis === 0 ? "chip alert" : "chip";
      return `
        <article class="event-card" data-event-id="${event.id}">
          <button class="delete-event-btn" type="button" data-event-id="${event.id}" aria-label="Excluir evento ${event.nome}">X</button>
          <h3>${event.nome}</h3>
          <p class="event-meta"><strong>ID:</strong> ${event.id}</p>
          <p class="event-meta"><strong>Local:</strong> ${event.local}</p>
          <p class="event-meta"><strong>Data:</strong> ${new Date(event.data_evento).toLocaleString("pt-BR")}</p>
          <p class="event-meta"><strong>Inscritos:</strong> ${event.total_inscritos} / ${event.limite_vagas}</p>
          <span class="${vagasClass}">Vagas: ${event.vagas_disponiveis}</span>
        </article>
      `;
    })
    .join("");
}

eventsGrid.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const deleteButton = target.closest(".delete-event-btn");
  if (deleteButton instanceof HTMLElement) {
    const eventId = Number(deleteButton.dataset.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      showFeedback("error", "ID de evento inválido.");
      return;
    }

    const confirmed = await openConfirmDialog(`Deseja excluir o evento ID ${eventId}?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/eventos/${eventId}`, { method: "DELETE" });
      await Promise.all([loadEvents(), loadParticipants()]);
      subscriptionsList.innerHTML = "";
      eventByIdResult.innerHTML = "";
      closeAttendeesModal();
      showFeedback("success", `Evento ${eventId} excluído com sucesso.`);
    } catch (error) {
      showFeedback("error", error.message);
    }
    return;
  }

  const eventCard = target.closest(".event-card");
  if (!(eventCard instanceof HTMLElement)) {
    return;
  }

  const eventId = Number(eventCard.dataset.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    showFeedback("error", "ID de evento inválido.");
    return;
  }

  const eventName = eventCard.querySelector("h3")?.textContent?.trim() || `Evento ${eventId}`;
  await openAttendeesModal(eventId, eventName);
});

function renderEventById(eventData) {
  eventByIdResult.innerHTML = `
    <article class="list-item">
      <div><strong>${eventData.nome}</strong> (ID: ${eventData.id})</div>
      <div>Local: ${eventData.local}</div>
      <div>Data: ${new Date(eventData.data_evento).toLocaleString("pt-BR")}</div>
      <div>Inscritos: ${eventData.total_inscritos} / ${eventData.limite_vagas}</div>
      <div>Vagas disponíveis: ${eventData.vagas_disponiveis}</div>
    </article>
  `;
}

function renderSubscriptions(subscriptions, container = subscriptionsList) {
  if (!container) {
    return;
  }

  if (!subscriptions.length) {
    container.innerHTML = '<p class="list-item">Evento sem inscrições.</p>';
    return;
  }

  container.innerHTML = subscriptions
    .map(
      (subscription) => `
      <article class="list-item">
        <div><strong>Inscrição #${subscription.id}</strong></div>
        <div>Participante: ${subscription.participante.nome}</div>
        <div>Email: ${subscription.participante.email}</div>
      </article>
    `
    )
    .join("");
}

function renderParticipants(participants) {
  if (!participants.length) {
    participantsList.innerHTML = '<p class="list-item">Nenhum participante cadastrado.</p>';
    return;
  }

  participantsList.innerHTML = participants
    .map(
      (participant) => `
      <article class="list-item">
        <div><strong>${participant.nome}</strong></div>
        <div>${participant.email}</div>
        <div>Total de inscrições: ${participant.total_inscricoes}</div>
      </article>
    `
    )
    .join("");
}

if (attendeesCloseBtn) {
  attendeesCloseBtn.addEventListener("click", closeAttendeesModal);
}

if (attendeesModal) {
  attendeesModal.addEventListener("click", (event) => {
    if (event.target === attendeesModal) {
      closeAttendeesModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && attendeesModal && !attendeesModal.classList.contains("hidden")) {
    closeAttendeesModal();
  }
});

async function checkHealth({ silent = false } = {}) {
  try {
    await apiRequest("/");
  } catch (error) {
    if (!silent) {
      showFeedback("error", error.message);
    }
    throw error;
  }
}

async function loadEvents() {
  const events = await apiRequest("/eventos");
  renderEvents(events);
  return events;
}

async function loadParticipants() {
  const participants = await apiRequest("/participantes");
  renderParticipants(participants);
  return participants;
}

refreshEventsBtn.addEventListener("click", async () => {
  try {
    const events = await loadEvents();
    showFeedback("success", `${events.length} evento(s) carregado(s).`);
  } catch (error) {
    showFeedback("error", error.message);
  }
});

createEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    nome: document.getElementById("eventName").value.trim(),
    descricao: document.getElementById("eventDescription").value.trim() || null,
    data_evento: document.getElementById("eventDate").value,
    local: document.getElementById("eventPlace").value.trim(),
    limite_vagas: Number(document.getElementById("eventCapacity").value),
  };

  try {
    const created = await apiRequest("/eventos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    createEventForm.reset();
    if (eventLookupInput) {
      eventLookupInput.value = created.id;
    }
    await loadEvents();
    showFeedback("success", `Evento criado com sucesso (ID ${created.id}).`);
  } catch (error) {
    showFeedback("error", error.message);
  }
});

eventByIdForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!eventLookupInput) {
    showFeedback("error", "Campo de ID do evento não encontrado.");
    return;
  }

  const eventId = Number(eventLookupInput.value);
  try {
    const eventData = await apiRequest(`/eventos/${eventId}`);
    renderEventById(eventData);
    showFeedback("success", "Evento encontrado.");
  } catch (error) {
    eventByIdResult.innerHTML = `<p class="list-item">${error.message}</p>`;
    showFeedback("error", error.message);
  }
});

createSubscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const eventId = Number(document.getElementById("subscriptionEventId").value);

  const payload = {
    participante: {
      nome: document.getElementById("participantName").value.trim(),
      email: document.getElementById("participantEmail").value.trim(),
    },
  };

  try {
    const created = await apiRequest(`/eventos/${eventId}/inscricoes`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await Promise.all([loadEvents(), loadParticipants()]);
    showFeedback("success", `Inscrição criada com sucesso (#${created.id}).`);
  } catch (error) {
    showFeedback("error", error.message);
  }
});

eventSubscriptionsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const eventId = Number(document.getElementById("subscriptionsEventId").value);

  try {
    const subscriptions = await apiRequest(`/eventos/${eventId}/inscricoes`);
    renderSubscriptions(subscriptions);
    showFeedback("success", `${subscriptions.length} inscrição(ões) encontrada(s).`);
  } catch (error) {
    subscriptionsList.innerHTML = `<p class="list-item">${error.message}</p>`;
    showFeedback("error", error.message);
  }
});

cancelSubscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const eventId = Number(document.getElementById("cancelEventId").value);
  const subscriptionId = Number(document.getElementById("cancelSubscriptionId").value);

  try {
    await apiRequest(`/eventos/${eventId}/inscricoes/${subscriptionId}`, {
      method: "DELETE",
    });
    await Promise.all([loadEvents(), loadParticipants()]);
    showFeedback("success", "Inscrição cancelada com sucesso.");
  } catch (error) {
    showFeedback("error", error.message);
  }
});

refreshParticipantsBtn.addEventListener("click", async () => {
  try {
    const participants = await loadParticipants();
    showFeedback("success", `${participants.length} participante(s) carregado(s).`);
  } catch (error) {
    showFeedback("error", error.message);
  }
});

async function bootstrap() {
  try {
    await checkHealth({ silent: true });
  } catch (_) {
    showFeedback("error", "API indisponível. Inicie o backend em http://127.0.0.1:8000.");
    return;
  }

  try {
    await loadEvents();
    await loadParticipants();
  } catch (error) {
    showFeedback("error", error.message);
  }
}

bootstrap();
