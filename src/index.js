import './style.css';

let state = {
    todo: [],
    'in-progress': [],
    done: []
  };
  

  const savedState = localStorage.getItem('trello-state');
  if (savedState) {
    state = JSON.parse(savedState);
  }
  
  const board = document.getElementById('board');
  

  let draggedEl = null;
  let placeholderEl = null;
  let shiftX = 0;
  let shiftY = 0;
  let originalColumnId = '';
  

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
  

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-delete';
        deleteBtn.innerHTML = '&#xE951;';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
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
      

      textarea.value = '';
      wrapper.querySelector('.add-card-form').classList.add('hidden');
      wrapper.querySelector('.add-card-btn').classList.remove('hidden');
    }
  });
  
  

  
  board.addEventListener('mousedown', (e) => {
    const cardEl = e.target.closest('.card');

    if (!cardEl || e.target.classList.contains('card-delete')) return;
  
    draggedEl = cardEl;
    originalColumnId = draggedEl.closest('.column').dataset.id;
  

    const rect = draggedEl.getBoundingClientRect();
    shiftX = e.clientX - rect.left;
    shiftY = e.clientY - rect.top;
  

    placeholderEl = document.createElement('div');
    placeholderEl.className = 'card-placeholder';
    placeholderEl.style.height = `${rect.height}px`;
  

    draggedEl.style.width = `${rect.width}px`;
    draggedEl.style.height = `${rect.height}px`;
    

    draggedEl.parentNode.insertBefore(placeholderEl, draggedEl);
    draggedEl.classList.add('dragged');
    

    moveAt(e.clientX, e.clientY);
    document.body.classList.add('dragging');
  

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
  

    draggedEl.style.display = 'none';
    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
    draggedEl.style.display = 'block';
  
    if (!elemBelow) return;
  

    const containerBelow = elemBelow.closest('.cards-container');
    const cardBelow = elemBelow.closest('.card:not(.dragged)');
  
    if (containerBelow) {
      if (cardBelow) {

        const rect = cardBelow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
  
        if (e.clientY < midpoint) {
          containerBelow.insertBefore(placeholderEl, cardBelow);
        } else {
          containerBelow.insertBefore(placeholderEl, cardBelow.nextSibling);
        }
      } else {

        containerBelow.appendChild(placeholderEl);
      }
    }
  }
  
  function onMouseUp() {
    if (!draggedEl) return;
  
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.classList.remove('dragging');
  

    const finalContainer = placeholderEl.parentNode;
    
    if (finalContainer && finalContainer.classList.contains('cards-container')) {
      const targetColumnId = finalContainer.closest('.column').dataset.id;
      

      const cardText = state[originalColumnId][parseInt(draggedEl.dataset.index)];
  

      state[originalColumnId].splice(parseInt(draggedEl.dataset.index), 1);
  

      const childrenArray = Array.from(finalContainer.children);
      const newIndex = childrenArray.indexOf(placeholderEl);
  

      state[targetColumnId].splice(newIndex, 0, cardText);
    }
  

    placeholderEl.remove();
    draggedEl.classList.remove('dragged');
    draggedEl = null;
    placeholderEl = null;
  

    saveToStorage();
    render();
  }
  
  render();