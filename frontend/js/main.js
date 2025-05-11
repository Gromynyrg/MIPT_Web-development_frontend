document.addEventListener('DOMContentLoaded', () => {
    // --- Код для Галереи Товара (если есть на странице) ---
    const gallery = document.querySelector('.product-gallery');
    if (gallery) {
        const mainImage = gallery.querySelector('#main-product-image');
        const thumbnails = gallery.querySelectorAll('.product-gallery__thumb');
        const prevButton = gallery.querySelector('.product-gallery__arrow--prev');
        const nextButton = gallery.querySelector('.product-gallery__arrow--next');
        
        let currentImageIndex = 0;
        const imageSources = [];

        // Убедимся, что основные элементы галереи существуют, прежде чем продолжить
        if (mainImage && thumbnails.length > 0) {
            thumbnails.forEach((thumb, index) => {
                const imgSrc = thumb.dataset.imageSrc;
                const imgAlt = thumb.dataset.imageAlt;
                if (imgSrc) { // Добавляем только если есть data-атрибут
                    imageSources.push({ src: imgSrc, alt: imgAlt });
                }

                // Устанавливаем начальный активный элемент
                if (mainImage.getAttribute('src') === imgSrc) {
                    currentImageIndex = imageSources.length -1; // Индекс в imageSources
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }

                thumb.addEventListener('click', () => {
                    const clickedIndex = Array.from(thumbnails).indexOf(thumb);
                    const sourceIndex = imageSources.findIndex(s => s.src === thumbnails[clickedIndex].dataset.imageSrc);
                    if(sourceIndex !== -1) {
                         updateMainProductImage(sourceIndex);
                    }
                });
            });
            
            // Если после цикла ни одна миниатюра не активна (например, src главного изображения не совпал ни с одной),
            // делаем активной первую и обновляем главное изображение
            if (imageSources.length > 0 && !gallery.querySelector('.product-gallery__thumb.active')) {
                thumbnails[0].classList.add('active');
                currentImageIndex = 0;
                // Обновляем главное изображение, если оно отличается от первой миниатюры
                if (mainImage.getAttribute('src') !== imageSources[0].src) {
                    updateMainProductImage(0);
                }
            } else if (imageSources.length > 0 && gallery.querySelector('.product-gallery__thumb.active')) {
                // Если активная миниатюра есть, убедимся, что currentImageIndex соответствует ей
                 const activeThumb = gallery.querySelector('.product-gallery__thumb.active');
                 const activeThumbSrc = activeThumb.dataset.imageSrc;
                 currentImageIndex = imageSources.findIndex(s => s.src === activeThumbSrc);
                 if (currentImageIndex === -1 && imageSources.length > 0) currentImageIndex = 0; // fallback
            }
        }

        function updateMainProductImage(index) {
            if (!mainImage || !imageSources[index]) return;

            mainImage.style.opacity = '0'; // Начинаем исчезновение

            setTimeout(() => {
                mainImage.src = imageSources[index].src;
                mainImage.alt = imageSources[index].alt || 'Изображение товара'; // Fallback alt
                mainImage.style.opacity = '1'; // Плавное появление
            }, 150); // Задержка должна быть меньше или равна времени transition в CSS для opacity

            thumbnails.forEach((t, i_thumb) => {
                 // Сравниваем data-image-src текущей миниатюры с src выбранного изображения
                t.classList.toggle('active', t.dataset.imageSrc === imageSources[index].src);
            });
            currentImageIndex = index;
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (imageSources.length === 0) return;
                let newIndex = currentImageIndex - 1;
                if (newIndex < 0) {
                    newIndex = imageSources.length - 1;
                }
                updateMainProductImage(newIndex);
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (imageSources.length === 0) return;
                let newIndex = currentImageIndex + 1;
                if (newIndex >= imageSources.length) {
                    newIndex = 0;
                }
                updateMainProductImage(newIndex);
            });
        }
    }


    // --- Универсальный обработчик для Счетчиков Количества ---
    document.querySelectorAll('.quantity-selector').forEach(selector => {
        const input = selector.querySelector('.quantity-selector__input');
        const decreaseBtn = selector.querySelector('.quantity-selector__button--decrease');
        const increaseBtn = selector.querySelector('.quantity-selector__button--increase');
        
        if (!input || !decreaseBtn || !increaseBtn) return;

        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 99;

        const updateQuantityValueAndDispatchEvent = (newValue) => {
            input.value = newValue;
            // Триггерим событие 'change', чтобы другие части JS (например, обновление корзины) могли на него отреагировать
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        decreaseBtn.addEventListener('click', () => {
            let currentValue = parseInt(input.value);
            if (currentValue > min) {
                updateQuantityValueAndDispatchEvent(currentValue - 1);
            }
        });

        increaseBtn.addEventListener('click', () => {
            let currentValue = parseInt(input.value);
            if (currentValue < max) {
                updateQuantityValueAndDispatchEvent(currentValue + 1);
            }
        });

        input.addEventListener('change', () => { // Валидация при потере фокуса или прямом изменении значения
            let currentValue = parseInt(input.value);
            if (isNaN(currentValue) || currentValue < min) {
                input.value = min; 
            } else if (currentValue > max) {
                input.value = max;
            }
            // Важно: чтобы не вызывать рекурсию, если updateCartDisplay тоже слушает 'change',
            // обновление корзины должно происходить после того, как значение инпута уже установлено.
            // В данном случае, updateCartDisplay вызывается далее специально для страницы корзины.
             if (document.querySelector('.cart-section')) { // Проверяем, находимся ли мы на странице корзины
                if (typeof window.updateCartDisplay === 'function') {
                     window.updateCartDisplay();
                }
            }
        });
        // Можно добавить обработчик 'input' для немедленной валидации при вводе с клавиатуры,
        // но он может быть сложнее в реализации, чтобы не мешать пользователю печатать.
        // 'change' обычно достаточно.
    });


    // --- Логика для Страницы Корзины ---
    const cartSection = document.querySelector('.cart-section');
    if (cartSection) {
        const selectAllCheckbox = cartSection.querySelector('#select-all-items');
        const cartItemsList = cartSection.querySelector('.cart-items-list'); // Родительский элемент для товаров
        const cartTotalPriceEl = cartSection.querySelector('#cart-total-price');
        
        // Функция форматирования цены (локальная для этого блока)
        const formatPrice = (price) => {
            return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
        };
        
        // Делаем функцию updateCartDisplay доступной глобально в контексте window,
        // чтобы ее мог вызвать обработчик 'change' универсального счетчика количества.
        // Это не самый чистый способ, но простой для данного случая.
        // Альтернатива: использовать кастомные события.
        window.updateCartDisplay = () => {
            let totalCartPrice = 0;
            let allItemsSelected = true;
            let atLeastOneItemSelected = false;
            const currentItemCheckboxes = cartItemsList.querySelectorAll('.cart-item__checkbox'); // Получаем актуальный список

            if (currentItemCheckboxes.length === 0 && selectAllCheckbox) { // Если товаров нет
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
                if (cartTotalPriceEl) cartTotalPriceEl.textContent = formatPrice(0);
                return; // Выходим, если корзина пуста
            }


            cartItemsList.querySelectorAll('.cart-item').forEach(itemEl => {
                const checkbox = itemEl.querySelector('.cart-item__checkbox');
                const pricePerUnitEl = itemEl.querySelector('.cart-item__price-per-unit');
                const quantityInput = itemEl.querySelector('.quantity-selector__input');
                const subtotalEl = itemEl.querySelector('.cart-item__subtotal');

                if (!checkbox || !pricePerUnitEl || !quantityInput || !subtotalEl) return; // Пропуск, если элементы не найдены

                const pricePerUnit = parseFloat(pricePerUnitEl.dataset.pricePerUnit);
                const quantity = parseInt(quantityInput.value);
                
                if (isNaN(pricePerUnit) || isNaN(quantity)) { // Пропуск, если данные некорректны
                    subtotalEl.textContent = formatPrice(0); // Или какое-то сообщение об ошибке
                    return; 
                }

                const itemSubtotal = pricePerUnit * quantity;
                subtotalEl.textContent = formatPrice(itemSubtotal);

                if (checkbox.checked) {
                    totalCartPrice += itemSubtotal;
                    atLeastOneItemSelected = true;
                } else {
                    allItemsSelected = false;
                }
            });

            if (cartTotalPriceEl) {
                cartTotalPriceEl.textContent = formatPrice(totalCartPrice);
            }
            
            if (selectAllCheckbox) {
                if (currentItemCheckboxes.length > 0) { // Проверяем, есть ли вообще товары
                    selectAllCheckbox.checked = allItemsSelected;
                    selectAllCheckbox.indeterminate = !allItemsSelected && atLeastOneItemSelected;
                } else { // Если товаров нет после удаления последнего
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                }
            }
        };

        // Обработчик для чекбокса "Выбрать всё"
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const itemCheckboxes = cartItemsList.querySelectorAll('.cart-item__checkbox'); // Получаем актуальный список
                itemCheckboxes.forEach(checkbox => {
                    checkbox.checked = selectAllCheckbox.checked;
                });
                window.updateCartDisplay();
            });
        }

        // Используем делегирование событий для чекбоксов товаров и кнопок удаления,
        // так как товары могут добавляться/удаляться динамически.
        cartItemsList.addEventListener('change', (event) => {
            if (event.target.classList.contains('cart-item__checkbox')) {
                window.updateCartDisplay();
            }
        });
        
        cartItemsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('cart-item__remove-button')) {
                const cartItemToRemove = event.target.closest('.cart-item');
                if (cartItemToRemove) {
                    cartItemToRemove.remove(); // Удаляем элемент из DOM
                    window.updateCartDisplay(); // Обновляем корзину после удаления
                }
            }
        });
        
        // Первоначальный расчет и обновление при загрузке страницы
        if (typeof window.updateCartDisplay === 'function') {
            window.updateCartDisplay();
        }
    }
});