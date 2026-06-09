import './style.css';
// Инициализация состояния
let state = {
    todo: [],
    'in-progress': [],
    done: []
  };
  
  // Загрузка из LocalStorage
  const savedState = localStorage.getItem('trello-state');
  if (savedState) {
    state = JSON.parse(savedState);
  }
  
  const board = document.getElementById('board');
  
  // Переменные для Drag and Drop
  let draggedEl = null;
  let placeholderEl = null;
  let shiftX = 0;
  let shiftY = 0;
  let originalColumnId = '';
  
  // --- РЕНДЕРИНГ ИЗ СОСТОЯНИЯ ---
  function saveToStorage() {
    localStorage.setItem('trello-state', JSON.stringify(state));
  }
  
  function render() {
    Object.keys(state).forEach(columnId => {
      const columnEl = document.querySelector(`.column[data-id="${columnId}"]`);
      const container = columnEl.querySelector('.cards-container');
      container.innerHTML = '';
  
      state[columnId].forEach((cardText, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.textContent = cardText;
        card.dataset.index = index;
  
        // Кнопка удаления карточки
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-delete';
        deleteBtn.innerHTML = '&#xE951;'; // Код крестика по ТЗ (или можно просто '✕')
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Исключаем срабатывание D&D при клике на крестик
          deleteCard(columnId, index);
        });
  
        card.appendChild(deleteBtn);
        container.appendChild(card);
      });
    });
  }
  
  function deleteCard(columnId, index) {
    state[columnId].splice(index, 1);
    saveToStorage();
    render();
  }
  
  // --- ИНТЕРФЕЙС ДОБАВЛЕНИЯ КАРТОЧЕК ---
  board.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-card-btn')) {
      const wrapper = e.target.closest('.add-card-wrapper');
      e.target.classList.add('hidden');
      wrapper.querySelector('.add-card-form').classList.remove('hidden');
      wrapper.querySelector('.card-textarea').focus();
    }
  
    if (e.target.classList.contains('cancel-card-btn')) {
      const wrapper = e.target.closest('.add-card-wrapper');
      wrapper.querySelector('.add-card-form').classList.add('hidden');
      wrapper.querySelector('.add-card-btn').classList.remove('hidden');
      wrapper.querySelector('.card-textarea').value = '';
    }
  
    if (e.target.classList.contains('save-card-btn')) {
      const columnEl = e.target.closest('.column');
      const columnId = columnEl.dataset.id;
      const wrapper = e.target.closest('.add-card-wrapper');
      const textarea = wrapper.querySelector('.card-textarea');
      const text = textarea.value.trim();
  
      if (text) {
        state[columnId].push(text);
        saveToStorage();
        render();
      }
      
      // Сбрасываем форму
      textarea.value = '';
      wrapper.querySelector('.add-card-form').classList.add('hidden');
      wrapper.querySelector('.add-card-btn').classList.remove('hidden');
    }
  });
  
  
  // --- ЛОГИКА DRAG AND DROP ---
  
  board.addEventListener('mousedown', (e) => {
    const cardEl = e.target.closest('.card');
    // Игнорируем нажатие, если кликнули по кнопке удаления
    if (!cardEl || e.target.classList.contains('card-delete')) return;
  
    draggedEl = cardEl;
    originalColumnId = draggedEl.closest('.column').dataset.id;
  
    // Расчет смещения курсора относительно левого верхнего угла карточки
    const rect = draggedEl.getBoundingClientRect();
    shiftX = e.clientX - rect.left;
    shiftY = e.clientY - rect.top;
  
    // Создаем плейсхолдер, который займет место карточки
    placeholderEl = document.createElement('div');
    placeholderEl.className = 'card-placeholder';
    placeholderEl.style.height = `${rect.height}px`;
  
    // Стилизуем перетаскиваемый элемент (превращаем в "фантом")
    draggedEl.style.width = `${rect.width}px`;
    draggedEl.style.height = `${rect.height}px`;
    
    // Вставляем плейсхолдер на место карточки, а саму карточку вырываем из потока
    draggedEl.parentNode.insertBefore(placeholderEl, draggedEl);
    draggedEl.classList.add('dragged');
    
    // Двигаем карточку на стартовую позицию
    moveAt(e.clientX, e.clientY);
    document.body.classList.add('dragging');
  
    // Вешаем слушатели на документ для плавного отслеживания движения
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  function moveAt(pageX, pageY) {
    if (!draggedEl) return;
    draggedEl.style.left = `${pageX - shiftX}px`;
    draggedEl.style.top = `${pageY - shiftY}px`;
  }
  
  function onMouseMove(e) {
    moveAt(e.clientX, e.clientY);
  
    // Скрываем на мгновение карточку, чтобы метод elementFromPoint заглянул "под" нее
    draggedEl.style.display = 'none';
    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
    draggedEl.style.display = 'block';
  
    if (!elemBelow) return;
  
    // Ищем контейнер колонки или карточку под курсором
    const containerBelow = elemBelow.closest('.cards-container');
    const cardBelow = elemBelow.closest('.card:not(.dragged)');
  
    if (containerBelow) {
      if (cardBelow) {
        // Логика "до" или "после" элемента в зависимости от Y-координаты курсора
        const rect = cardBelow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
  
        if (e.clientY < midpoint) {
          containerBelow.insertBefore(placeholderEl, cardBelow);
        } else {
          containerBelow.insertBefore(placeholderEl, cardBelow.nextSibling);
        }
      } else {
        // Если под курсором нет карточки — добавляем плейсхолдер в конец контейнера
        containerBelow.appendChild(placeholderEl);
      }
    }
  }
  
  function onMouseUp() {
    if (!draggedEl) return;
  
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.classList.remove('dragging');
  
    // Определяем, куда в итоге попал placeholder
    const finalContainer = placeholderEl.parentNode;
    
    if (finalContainer && finalContainer.classList.contains('cards-container')) {
      const targetColumnId = finalContainer.closest('.column').dataset.id;
      
      // Находим текст перетаскиваемой карточки из старого состояния
      const cardText = state[originalColumnId][parseInt(draggedEl.dataset.index)];
  
      // Удаляем карточку из старого массива данных
      state[originalColumnId].splice(parseInt(draggedEl.dataset.index), 1);
  
      // Вычисляем новый индекс на основе позиции placeholder'а в DOM
      const childrenArray = Array.from(finalContainer.children);
      const newIndex = childrenArray.indexOf(placeholderEl);
  
      // Вставляем в новый массив данных
      state[targetColumnId].splice(newIndex, 0, cardText);
    }
  
    // Очищаем временные элементы и стили
    placeholderEl.remove();
    draggedEl.classList.remove('dragged');
    draggedEl = null;
    placeholderEl = null;
  
    // Сохраняем обновленное состояние и полностью перерисовываем интерфейс
    saveToStorage();
    render();
  }
  
  // Первый запуск отрисовки приложения при загрузке страницы
  render();