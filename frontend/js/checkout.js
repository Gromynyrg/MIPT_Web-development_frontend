document.addEventListener('DOMContentLoaded', () => {
    // --- Управление отображением полей в зависимости от способа доставки ---
    const deliveryMethodRadios = document.querySelectorAll('input[name="deliveryMethod"]');
    const postalAddressGroup = document.getElementById('postal-address-group');
    const addressTextarea = document.getElementById('address');
    const pickupSection = document.getElementById('pickup-section'); // Секция с картой и инфо о самовывозе

    function toggleDeliveryFields() {
        if (!postalAddressGroup || !addressTextarea || !pickupSection) {
            console.warn("Элементы для управления доставкой не найдены на странице.");
            return;
        }

        const selectedMethodRadio = document.querySelector('input[name="deliveryMethod"]:checked');
        if (!selectedMethodRadio) {
            // Если ни один не выбран (хотя один должен быть checked по умолчанию)
            postalAddressGroup.classList.add('hidden-field');
            addressTextarea.required = false;
            pickupSection.classList.remove('hidden-field'); // Показываем самовывоз по умолчанию
            return;
        }
        
        const selectedMethod = selectedMethodRadio.value;

        if (selectedMethod === 'pickup') {
            postalAddressGroup.classList.add('hidden-field');
            addressTextarea.required = false;
            // addressTextarea.value = ''; // Опционально: очищать поле
            pickupSection.classList.remove('hidden-field');
        } else { // 'post'
            postalAddressGroup.classList.remove('hidden-field');
            addressTextarea.required = true;
            pickupSection.classList.add('hidden-field');
        }
    }

    if (deliveryMethodRadios.length > 0) {
        deliveryMethodRadios.forEach(radio => {
            radio.addEventListener('change', toggleDeliveryFields);
        });
        // Инициализация состояния полей при загрузке страницы
        toggleDeliveryFields(); 
    }

    // --- Код для промокода ---
    const promoCodeInput = document.getElementById('promo-code');
    const applyPromoBtn = document.getElementById('apply-promo-btn');
    // Переменные для сумм, доступные в области видимости DOMContentLoaded
    let currentSubtotal = 16181; // Эти значения должны браться из корзины в реальном приложении
    let currentDiscount = 0;

    const VALID_PROMO_CODES = {
        "SALE10": { type: "percentage", value: 10 },
        "FIXED500": { type: "fixed", value: 500 },
        "MYCODE": { type: "fixed", value: 1125 }
    };
    const formatPrice = (price) => {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
    };
    
    // Сделаем функцию глобальной или доступной для вызова, если она нужна извне
    window.updateOrderSummary = () => { 
        const orderSubtotalEl = document.getElementById('order-subtotal');
        const orderDiscountEl = document.getElementById('order-discount');
        const orderGrandTotalEl = document.getElementById('order-grand-total');
        
        if (!orderSubtotalEl || !orderDiscountEl || !orderGrandTotalEl) return;
        orderSubtotalEl.textContent = formatPrice(currentSubtotal);
        let calculatedDiscount = 0;
        const appliedPromo = promoCodeInput && promoCodeInput.dataset.appliedPromo;

        if (appliedPromo && VALID_PROMO_CODES[appliedPromo]) {
            const promo = VALID_PROMO_CODES[appliedPromo];
            if (promo.type === "percentage") calculatedDiscount = (currentSubtotal * promo.value) / 100;
            else if (promo.type === "fixed") calculatedDiscount = promo.value;
            calculatedDiscount = Math.min(calculatedDiscount, currentSubtotal);
        }
        currentDiscount = calculatedDiscount; // Обновляем глобальную currentDiscount
        orderDiscountEl.textContent = formatPrice(currentDiscount * -1);
        const grandTotal = currentSubtotal - currentDiscount;
        orderGrandTotalEl.textContent = formatPrice(grandTotal > 0 ? grandTotal : 0);
    };

    if (applyPromoBtn && promoCodeInput) {
        const promoStatusEl = document.getElementById('promo-status');
        applyPromoBtn.addEventListener('click', () => {
            const promoCode = promoCodeInput.value.trim().toUpperCase();
            if (promoStatusEl) {
                promoStatusEl.textContent = '';
                promoStatusEl.className = 'promo-status-message';
            }
            if(promoCodeInput.dataset) promoCodeInput.dataset.appliedPromo = "";

            if (!promoCode) {
                if (promoStatusEl) {
                    promoStatusEl.textContent = 'Пожалуйста, введите промокод.';
                    promoStatusEl.classList.add('error');
                }
                updateOrderSummary();
                return;
            }
            if (VALID_PROMO_CODES[promoCode]) {
                if(promoCodeInput.dataset) promoCodeInput.dataset.appliedPromo = promoCode;
                if (promoStatusEl) {
                    promoStatusEl.textContent = 'Промокод применен!';
                    promoStatusEl.classList.add('success');
                }
            } else {
                if (promoStatusEl) {
                    promoStatusEl.textContent = 'Неверный промокод.';
                    promoStatusEl.classList.add('error');
                }
            }
            updateOrderSummary();
        });
    }
    
    // Инициализация промокода по умолчанию (если скидка уже отображена в HTML)
    if (promoCodeInput && document.getElementById('order-discount') && document.getElementById('order-discount').textContent.trim() === "-1 125 ₽") {
        for (const code in VALID_PROMO_CODES) {
            if (VALID_PROMO_CODES[code].type === "fixed" && VALID_PROMO_CODES[code].value === 1125) {
                promoCodeInput.value = code;
                if(promoCodeInput.dataset) promoCodeInput.dataset.appliedPromo = code;
                const promoStatusEl = document.getElementById('promo-status');
                if(promoStatusEl) {
                    promoStatusEl.textContent = 'Промокод применен.';
                    promoStatusEl.classList.add('success');
                }
                break;
            }
        }
    }
    if (typeof updateOrderSummary === 'function') { // Вызываем обновление сумм при загрузке
        updateOrderSummary();
    }


    // --- Обработка формы ---
    const recipientForm = document.getElementById('recipient-form');
    if (recipientForm) {
        recipientForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            toggleDeliveryFields(); // Убедимся, что состояние required у поля адреса актуально

            if (!this.checkValidity()) {
                alert('Пожалуйста, заполните все обязательные поля корректно.');
                // Попытка показать стандартные HTML5 сообщения об ошибках для полей
                // Это может не сработать для скрытых полей, поэтому важно управлять `required`
                let firstInvalidField = this.querySelector(':invalid');
                if(firstInvalidField) firstInvalidField.focus();
                return;
            }

            const formData = new FormData(this);
            const data = {};
            formData.forEach((value, key) => { data[key] = value; });
            
            data.orderSubtotal = currentSubtotal; 
            data.orderDiscount = currentDiscount; 
            data.orderGrandTotal = currentSubtotal - currentDiscount;
            data.appliedPromoCode = (promoCodeInput && promoCodeInput.dataset.appliedPromo) ? promoCodeInput.dataset.appliedPromo : null;

            console.log('Данные заказа отправлены:', data);
            
            const simulatedOrderNumber = "ORD-" + Math.floor(Math.random() * 100000) + "-" + new Date().getFullYear().toString().slice(-2);
            try {
                localStorage.setItem('lastOrderNumber', simulatedOrderNumber);
                localStorage.setItem('lastOrderDeliveryDate', '25.12'); // Пример
                localStorage.setItem('lastOrderDeliveryTime', '18:00'); // Пример
            } catch (e) { console.warn("Не удалось сохранить данные заказа в localStorage:", e); }
            
            window.location.href = 'order-confirmation.html';
        });
    }
});