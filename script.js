document.addEventListener('DOMContentLoaded', () => {
    const INITIAL_READING = 14520;
    const FREE_LIMIT = 80;
    const SAFETY_CAP = 150;
    const PURE_KWH_RATE = 0.65;
    const TAX_MULTIPLIER = 0.40;
    const COSIP_VALUE = 22.50;

    // Navegação entre Telas
    const screens = document.querySelectorAll('.app-screen');
    const stepNavBtns = document.querySelectorAll('.step-nav-btn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    function goToScreen(screenId) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');

        stepNavBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-target') === screenId);
        });
    }

    // Botões do painel lateral para saltar etapas
    stepNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            goToScreen(btn.getAttribute('data-target'));
        });
    });

    // Fluxo Real: Tela 1 (Login) -> Tela 2 (Home)
    function handleLogin() {
        loadingText.textContent = 'Validando CPF no Gov.br e cruzando CadÚnico...';
        loadingOverlay.classList.add('open');
        setTimeout(() => {
            loadingOverlay.classList.remove('open');
            goToScreen('screen-home');
        }, 900);
    }

    document.getElementById('btnDoLogin').addEventListener('click', handleLogin);
    document.getElementById('btnBiometria').addEventListener('click', handleLogin);
    document.getElementById('btnLogout').addEventListener('click', () => goToScreen('screen-login'));

    // Fluxo Real: Tela 2 (Home) -> Tela 3 (Minha Energia Social)
    function openEnergyModule() {
        loadingText.textContent = 'Sincronizando consumo com Neoenergia Coelba...';
        loadingOverlay.classList.add('open');
        setTimeout(() => {
            loadingOverlay.classList.remove('open');
            goToScreen('screen-energy');
        }, 650);
    }

    document.getElementById('cardOpenTarifaLimpa').addEventListener('click', openEnergyModule);
    document.getElementById('tileOpenTarifaLimpa').addEventListener('click', openEnergyModule);
    document.getElementById('btnBackToHome').addEventListener('click', () => goToScreen('screen-home'));

    // Navegação inferior
    document.querySelectorAll('.nav-item[data-screen]').forEach(nav => {
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            const target = nav.getAttribute('data-screen');
            if (target === 'screen-energy') {
                openEnergyModule();
            } else {
                goToScreen(target);
            }
        });
    });

    // Elementos da Tela 3 (Energia Social)
    const kwhValueEl = document.getElementById('kwhValue');
    const homePreviewKwhEl = document.getElementById('homePreviewKwh');
    const currentReadingEl = document.getElementById('currentReading');
    const progressBarEl = document.getElementById('progressBar');
    const alertBannerEl = document.getElementById('alertBanner');
    const alertIconEl = document.getElementById('alertIcon');
    const alertTitleEl = document.getElementById('alertTitle');
    const alertDescEl = document.getElementById('alertDesc');

    const regimeBadgeEl = document.getElementById('regimeBadge');
    const billTotalEl = document.getElementById('billTotal');
    const taxSavedEl = document.getElementById('taxSaved');
    const extraKwhLabelEl = document.getElementById('extraKwhLabel');
    const rowExtraEnergyEl = document.getElementById('rowExtraEnergy');
    const rowTaxesEl = document.getElementById('rowTaxes');
    const rowCosipEl = document.getElementById('rowCosip');
    const btnPixEl = document.getElementById('btnPix');

    const inputReadingEl = document.getElementById('inputReading');
    const btnUpdateReadingEl = document.getElementById('btnUpdateReading');
    const readingFeedbackEl = document.getElementById('readingFeedback');

    const scenarioBtns = document.querySelectorAll('.scenario-btn');
    const pixModalEl = document.getElementById('pixModal');
    const modalPixAmountEl = document.getElementById('modalPixAmount');
    const btnCloseModalEl = document.getElementById('btnCloseModal');

    function formatBRL(val) {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function updateDashboard(consumedKwh) {
        const currentMeter = INITIAL_READING + consumedKwh;
        kwhValueEl.textContent = consumedKwh;
        homePreviewKwhEl.textContent = `${consumedKwh} kWh`;
        currentReadingEl.textContent = currentMeter.toLocaleString('pt-BR');

        const percentage = Math.min((consumedKwh / SAFETY_CAP) * 100, 100);
        progressBarEl.style.width = `${percentage}%`;

        alertBannerEl.classList.remove('status-green', 'status-yellow', 'status-red');
        progressBarEl.classList.remove('status-green', 'status-yellow', 'status-red');

        let extraKwh = Math.max(0, consumedKwh - FREE_LIMIT);
        let totalToPay = 0;
        let savedAmount = COSIP_VALUE;

        if (consumedKwh <= 60) {
            const remaining = FREE_LIMIT - consumedKwh;
            alertBannerEl.classList.add('status-green');
            progressBarEl.classList.add('status-green');
            alertIconEl.textContent = '✓';
            alertTitleEl.textContent = 'Consumo dentro da faixa gratuita!';
            alertDescEl.textContent = `Você ainda tem ${remaining} kWh gratuitos disponíveis neste ciclo. Sua fatura está zerada.`;
            regimeBadgeEl.textContent = 'GRATUIDADE TOTAL (0–80 kWh)';
        } else if (consumedKwh <= FREE_LIMIT) {
            const remaining = FREE_LIMIT - consumedKwh;
            alertBannerEl.classList.add('status-yellow');
            progressBarEl.classList.add('status-yellow');
            alertIconEl.textContent = '!';
            alertTitleEl.textContent = `Atenção: Faltam ${remaining} kWh para o limite gratuito`;
            alertDescEl.textContent = 'Se ultrapassar 80 kWh, você pagará apenas pelo excedente puro, sem impostos e sem COSIP.';
            regimeBadgeEl.textContent = 'ALERTA PREVENTIVO (80 kWh)';
        } else if (consumedKwh <= SAFETY_CAP) {
            alertBannerEl.classList.add('status-red');
            progressBarEl.classList.add('status-red');
            alertIconEl.textContent = '⚡';
            alertTitleEl.textContent = `Excedente Protegido: +${extraKwh} kWh além da cota`;
            alertDescEl.textContent = 'Blindagem ativa! Você paga apenas a energia adicional consumida, livre de ICMS, PIS/COFINS e COSIP.';
            regimeBadgeEl.textContent = 'EXCEDENTE LIMPO (SEM IMPOSTOS)';

            totalToPay = extraKwh * PURE_KWH_RATE;
            const avoidedTaxOnExtra = (totalToPay / (1 - TAX_MULTIPLIER)) - totalToPay;
            savedAmount = COSIP_VALUE + avoidedTaxOnExtra;
        } else {
            alertBannerEl.classList.add('status-red');
            progressBarEl.classList.add('status-red');
            alertIconEl.textContent = '⚠';
            alertTitleEl.textContent = 'Consumo acima do teto residencial (150 kWh)';
            alertDescEl.textContent = 'Os 70 kWh entre 81 e 150 continuam isentos, mas o que passou de 150 kWh volta a ter tributação normal.';
            regimeBadgeEl.textContent = 'TRAVA FISCAL ACIMA DE 150 kWh';

            const protectedExtra = 70 * PURE_KWH_RATE;
            const overCapKwh = consumedKwh - SAFETY_CAP;
            const taxedOverCap = (overCapKwh * PURE_KWH_RATE) / (1 - TAX_MULTIPLIER);
            totalToPay = protectedExtra + taxedOverCap;

            const avoidedTaxOn70 = (protectedExtra / (1 - TAX_MULTIPLIER)) - protectedExtra;
            savedAmount = COSIP_VALUE + avoidedTaxOn70;
        }

        extraKwhLabelEl.textContent = extraKwh;
        rowExtraEnergyEl.textContent = formatBRL(extraKwh * PURE_KWH_RATE);
        billTotalEl.textContent = formatBRL(totalToPay);
        taxSavedEl.textContent = formatBRL(savedAmount);

        if (consumedKwh <= SAFETY_CAP) {
            rowTaxesEl.textContent = 'ISENTO (R$ 0,00)';
            rowTaxesEl.className = 'val-exempt';
            rowCosipEl.textContent = 'ISENTO (R$ 0,00)';
            rowCosipEl.className = 'val-exempt';
        } else {
            const overCapKwh = consumedKwh - SAFETY_CAP;
            const taxCharged = ((overCapKwh * PURE_KWH_RATE) / (1 - TAX_MULTIPLIER)) - (overCapKwh * PURE_KWH_RATE);
            rowTaxesEl.textContent = `+ ${formatBRL(taxCharged)} (só acima de 150)`;
            rowTaxesEl.className = 'val-taxed';
            rowCosipEl.textContent = 'ISENTO (R$ 0,00)';
            rowCosipEl.className = 'val-exempt';
        }

        if (totalToPay > 0) {
            btnPixEl.disabled = false;
            btnPixEl.classList.add('active-pix');
            btnPixEl.textContent = `Pagar Excedente Limpo via Pix (${formatBRL(totalToPay)})`;
            modalPixAmountEl.textContent = formatBRL(totalToPay);
        } else {
            btnPixEl.disabled = true;
            btnPixEl.classList.remove('active-pix');
            btnPixEl.textContent = 'Fatura Zerada — Nada a Pagar';
        }
    }

    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            scenarioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const kwh = parseInt(btn.getAttribute('data-kwh'), 10);
            updateDashboard(kwh);
            goToScreen('screen-energy');
        });
    });

    btnUpdateReadingEl.addEventListener('click', () => {
        const typedReading = parseInt(inputReadingEl.value, 10);
        if (isNaN(typedReading) || typedReading < INITIAL_READING) {
            readingFeedbackEl.textContent = `Digite um número igual ou maior que ${INITIAL_READING}.`;
            readingFeedbackEl.style.color = '#DC2626';
            return;
        }
        const newConsumed = typedReading - INITIAL_READING;
        scenarioBtns.forEach(b => b.classList.remove('active'));
        updateDashboard(newConsumed);
        readingFeedbackEl.textContent = `Autoleitura confirmada agora! Consumo real: ${newConsumed} kWh.`;
        readingFeedbackEl.style.color = '#0F766E';
        inputReadingEl.value = '';
    });

    btnPixEl.addEventListener('click', () => {
        if (!btnPixEl.disabled) pixModalEl.classList.add('open');
    });

    btnCloseModalEl.addEventListener('click', () => pixModalEl.classList.remove('open'));

    updateDashboard(48);
});