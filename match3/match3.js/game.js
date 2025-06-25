// DOM(Document Object Model) 콘텐츠가 웹 페이지에 완전히 로드된 후,
// 이 스크립트가 실행되도록 설정합니다.
document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // --- 상수 및 열거형 정의 (Constants and Enums) ---
    // 게임의 기본 규칙과 설정을 담고 있는 부분입니다.
    // 이 값들을 수정하면 게임의 크기, 난이도, 애니메이션 속도 등을 쉽게 변경할 수 있습니다.
    // =========================================================================

    // --- 그리드 및 셀 크기 ---
    const GRID_ROWS = 8; // 게임 보드의 세로 줄 수 (행)
    const GRID_COLS = 8; // 게임 보드의 가로 줄 수 (열)
    const CELL_SIZE = 50; // 각 셀(칸)의 크기를 50픽셀로 지정

    // --- 아이템 모양 타입 정의 (Enumeration) ---
    // 각 모양을 숫자로 명확하게 구분하기 위해 사용합니다.
    const ShapeType = {
        CIRCLE: 0,
        SQUARE: 1,
        TRIANGLE: 2,
        DIAMOND: 3,
        HEXAGON: 4,
        STAR: 5,
    };

    // --- 특수 아이템 타입 정의 (Enumeration) ---
    // 특수 아이템의 종류를 숫자로 구분합니다.
    const SpecialItemType = {
        LINE_H: 0,       // 가로 한 줄 전체를 제거하는 아이템
        LINE_V: 1,       // 세로 한 줄 전체를 제거하는 아이템
        BOMB: 2,         // 주변 3x3 영역을 제거하는 폭탄 아이템
        SCREEN_CLEAR: 3, // 화면의 모든 아이템을 제거하는 아이템
        CROSS_CLEAR: 4,  // 십자 모양(가로+세로 한 줄씩)을 제거하는 아이템
    };

    // --- 아이템 색상 매핑 ---
    // 위에서 정의한 각 아이템 타입에 해당하는 색상 코드를 지정합니다.
    const SHAPE_COLORS = {
        [ShapeType.CIRCLE]: '#EF4444',   // 빨강
        [ShapeType.SQUARE]: '#3B82F6',   // 파랑
        [ShapeType.TRIANGLE]: '#22C55E', // 초록
        [ShapeType.DIAMOND]: '#EAB308',  // 노랑
        [ShapeType.HEXAGON]: '#A855F7',  // 보라
        [ShapeType.STAR]: '#F97316',     // 주황
    };

    // --- 게임 플레이 관련 상수 ---
    const ALL_SHAPE_TYPES = Object.values(ShapeType); // 모든 모양 타입을 배열 형태로 만들어 쉽게 접근하도록 합니다.
    const POINTS_PER_ITEM = 10; // 아이템 하나를 제거했을 때 얻는 기본 점수입니다.

    // --- 애니메이션 지속 시간 (밀리초 단위, 1000ms = 1초) ---
    const ATTEMPTING_SWAP_ANIMATION_DURATION = 150; // 아이템을 교환하려고 시도할 때의 애니메이션 시간
    const SPECIAL_ACTIVATION_ANIMATION_DURATION = 200; // 특수 아이템이 발동될 때의 시각 효과 시간
    const MATCH_ANIMATION_DURATION = 250; // 매치된 아이템이 사라지는 애니메이션 시간
    const INVALID_SWAP_ANIMATION_DURATION = 150; // 잘못된 교환으로 아이템이 원래 위치로 돌아가는 애니메이션 시간
    const COMBO_TEXT_DURATION = 600; // 콤보 텍스트가 화면에 표시되는 시간

    // --- 애니메이션 속도 ---
    const FALL_ANIMATION_SPEED = 7; // 아이템이 중력에 의해 아래로 떨어지는 속도 (프레임당 픽셀)
    const REFILL_ANIMATION_SPEED = 7; // 새로운 아이템이 위에서부터 채워지는 속도 (프레임당 픽셀)

    // --- 시각 효과 관련 상수 ---
    const DRAG_ITEM_SCALE = 1.1; // 사용자가 드래그하는 아이템의 크기를 1.1배로 확대
    const DRAG_ITEM_ALPHA = 0.75; // 드래그하는 아이템을 75%의 투명도로 설정
    const BOMB_EFFECT_RADIUS = 1; // 폭탄 아이템의 폭발 반경 (1이면 중심 포함 3x3 영역)

    // --- 힌트 및 셔플 관련 상수 ---
    const HINT_DELAY = 3000; // 사용자가 아무 조작도 하지 않을 때 3초 후에 힌트를 표시
    const HINT_PULSE_SPEED = 300; // 힌트가 깜빡이는 속도
    const SHUFFLE_DELAY = 1000; // '셔플 중' 메시지가 표시된 후 1초 뒤에 실제 보드를 섞음

    // --- 유틸리티(도우미) 함수 ---
    // 위치 객체 {row: r, col: c}를 'r-c' 형태의 문자열로 변환합니다.
    // Set이나 객체의 키로 사용하기 편리합니다.
    const posToString = (p) => `${p.row}-${p.col}`;

    // 'r-c' 형태의 문자열을 다시 위치 객체 {row: r, col: c}로 변환합니다.
    const stringToPos = (s) => {
        const parts = s.split('-');
        const row = parseInt(parts[0]);
        const col = parseInt(parts[1]);
        return { row: row, col: col };
    };

    // =========================================================================
    // --- 메인 게임 클래스 (Game Class) ---
    // 게임의 모든 상태와 로직을 캡슐화하여 관리하는 핵심 부분입니다.
    // =========================================================================
    class Game {
        /**
         * 게임 클래스의 생성자(constructor)입니다.
         * 게임 객체가 생성될 때 가장 먼저 실행되며, 게임에 필요한 모든 것을 초기화하고 설정합니다.
         */
        constructor() {
            // --- 1. DOM 요소 참조 ---
            // HTML 문서에서 ID를 통해 필요한 요소들을 찾아와 클래스의 속성으로 저장합니다.
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.scoreElement = document.getElementById('score');
            this.maxComboElement = document.getElementById('max-combo');
            this.restartButton = document.getElementById('restart-button');
            this.gameOverMessageElement = document.getElementById('game-over-message');
            this.shuffleMessageElement = document.getElementById('shuffle-message');

            // --- 2. 캔버스 크기 설정 ---
            // 상수에 정의된 그리드 크기와 셀 크기를 바탕으로 캔버스의 너비와 높이를 계산합니다.
            this.canvas.width = GRID_COLS * CELL_SIZE;
            this.canvas.height = GRID_ROWS * CELL_SIZE;

            // --- 3. 초기화 메서드 순차적 호출 ---
            this.bindMethods();         // `this` 컨텍스트 문제를 방지하기 위해 메서드를 바인딩합니다.
            this.setupEventListeners(); // 사용자의 입력을 처리할 이벤트 리스너를 설정합니다.
            this.initializeGame();      // 게임의 모든 상태를 초기화하고 게임을 시작합니다.
        }

        /**
         * 클래스 메서드들이 항상 'this'를 Game 인스턴스로 참조하도록 강제로 바인딩합니다.
         * 이벤트 리스너나 콜백 함수에서 'this'가 의도치 않게 변경되는 것을 방지합니다.
         */
        bindMethods() {
            this.gameLoop = this.gameLoop.bind(this);
            this.handleMouseDown = this.handleMouseDown.bind(this);
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleMouseUp = this.handleMouseUp.bind(this);
            this.handleRestartGame = this.handleRestartGame.bind(this);
        }

        /**
         * 사용자의 입력을 감지하기 위해 마우스 및 터치 이벤트 리스너를 캔버스와 창에 등록합니다.
         * 이를 통해 PC와 모바일 환경 모두에서 게임을 조작할 수 있습니다.
         */
        setupEventListeners() {
            // --- 마우스 이벤트 리스너 ---
            this.canvas.addEventListener('mousedown', this.handleMouseDown);
            window.addEventListener('mousemove', this.handleMouseMove);
            window.addEventListener('mouseup', this.handleMouseUp);

            // --- 터치 이벤트 리스너 (모바일 지원) ---
            // passive: false 옵션은 터치 시 브라우저의 기본 동작(예: 화면 스크롤)을 막기 위함입니다.
            this.canvas.addEventListener('touchstart', this.handleMouseDown, { passive: false });
            window.addEventListener('touchmove', this.handleMouseMove, { passive: false });
            window.addEventListener('touchend', this.handleMouseUp);
            window.addEventListener('touchcancel', this.handleMouseUp); // 터치가 예기치 않게 중단될 때도 처리합니다.

            // --- UI 요소 이벤트 리스너 ---
            this.restartButton.addEventListener('click', this.handleRestartGame);
            this.canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // 캔버스에서 우클릭 시 나타나는 메뉴를 막습니다.
        }

        /**
         * 게임의 모든 상태 변수를 초기값으로 리셋합니다.
         * 새 게임을 시작하거나 '다시 시작' 버튼을 눌렀을 때 호출됩니다.
         */
        initializeGame() {
            // 게임 보드 상태: 2차원 배열로, 각 칸의 아이템 정보를 저장합니다.
            this.grid = [];

            // 점수 및 게임 오버 상태
            this.score = 0;
            this.isGameOver = false;

            // 콤보 관련 상태
            this.comboCount = 0; // 현재 연속 콤보 횟수
            this.maxCombo = 0; // 이번 판의 최대 콤보 기록
            this.comboTextInfo = null; // 캔버스에 표시할 콤보 텍스트 정보({text, x, y, startTime})

            // 사용자 입력(드래그) 관련 상태
            this.isDragging = false; // 현재 아이템을 드래그 중인지 여부
            this.startDragCell = null; // 드래그를 시작한 셀의 위치
            this.draggedItemMousePos = null; // 드래그 중인 마우스/터치 포인터의 캔버스 내 좌표
            this.potentialClick = false; // 드래그가 아닌 단순 클릭인지 판별하기 위한 플래그
            this.clickStartPos = null; // 클릭(터치)을 시작한 위치
            this.lastFailedSwapTarget = null; // 연속적인 잘못된 스왑 시도를 방지하기 위한 정보

            // 게임 로직 및 애니메이션 상태
            this.isProcessingMove = false; // 현재 매치-낙하-리필의 연쇄 반응을 처리 중인지 여부
            this.animationState = { type: 'idle' }; // 현재 애니메이션 상태 (예: 'idle', 'matching', 'falling')
            this.animationFrameId = null; // requestAnimationFrame의 ID를 저장하여 취소할 수 있도록 함

            // 힌트 및 셔플 상태
            this.hintTimerId = null;
            this.hintToDisplay = null;
            this.lastInteractionTime = Date.now();
            this.hasShuffledRecently = false;
            this.isShufflingBoard = false;

            // UI 초기화
            this.updateScore(0);
            this.updateMaxCombo(0);
            this.showGameOverMessage(false);
            this.showShuffleMessage(false);

            // 게임 보드를 생성하고 다음 게임 로직을 시작합니다.
            this.initializeGridAndLogic();

            // 기존에 실행 중인 게임 루프가 있다면 취소하고,
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
            // 새로운 게임 루프를 시작합니다.
            this.gameLoop();
        }

        /** '다시 시작' 버튼을 클릭했을 때 호출되는 이벤트 핸들러입니다. */
        handleRestartGame() {
            this.initializeGame();
        }

        // --- UI 업데이트 메서드 ---

        /** 화면의 점수 표시를 업데이트합니다. */
        updateScore(newScore) {
            this.score = newScore;
            this.scoreElement.textContent = this.score;
        }

        /** 화면의 최고 콤보 표시를 업데이트합니다. */
        updateMaxCombo(newMaxCombo) {
            this.maxCombo = newMaxCombo;
            this.maxComboElement.textContent = this.maxCombo;
        }

        /** 게임 오버 메시지를 보여주거나 숨깁니다. */
        showGameOverMessage(show) {
            this.isGameOver = show;
            this.gameOverMessageElement.classList.toggle('hidden', !show);
            if (show) {
                this.endCombo();
            }
        }

        /** 보드 셔플 메시지를 보여주거나 숨깁니다. */
        showShuffleMessage(show) {
             this.shuffleMessageElement.classList.toggle('hidden', !show);
        }

        // --- 콤보 관리 메서드 ---

        /** 콤보 카운트를 1 증가시키고, 캔버스에 텍스트를 표시할 준비를 합니다. */
        incrementCombo(matchPositions) {
            this.comboCount = this.comboCount + 1;

            if (this.comboCount > 1) {
                let sumX = 0;
                let sumY = 0;
                matchPositions.forEach(p => {
                    sumX = sumX + (p.col * CELL_SIZE) + (CELL_SIZE / 2);
                    sumY = sumY + (p.row * CELL_SIZE) + (CELL_SIZE / 2);
                });
                const centerX = sumX / matchPositions.length;
                const centerY = sumY / matchPositions.length;

                this.comboTextInfo = {
                    text: `Combo x${this.comboCount}`,
                    x: centerX,
                    y: centerY,
                    startTime: Date.now()
                };
            }
        }

        /** 연쇄 반응이 끝났을 때 호출됩니다. 최고 콤보를 갱신하고 카운트를 0으로 리셋합니다. */
        endCombo() {
            if (this.comboCount > this.maxCombo) {
                this.updateMaxCombo(this.comboCount);
            }
            this.comboCount = 0;
        }

        // --- 핵심 게임 로직 구현부 ---

        /** 무작위 아이템 객체를 하나 생성합니다. */
        createRandomItem(excludeTypes = []) {
            let availableTypes = ALL_SHAPE_TYPES.filter(t => !excludeTypes.includes(t));
            if (availableTypes.length === 0) {
                availableTypes = ALL_SHAPE_TYPES;
            }
            const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const newItem = {
                type: type,
                color: SHAPE_COLORS[type],
                id: Math.random().toString(36).substring(7)
            };
            return newItem;
        }

        /** 특수 아이템의 종류에 따라 효과 범위를 계산하여 위치 배열로 반환합니다. */
        getSpecialEffectCells(itemPos, specialType) {
            const effectCells = [];
            switch (specialType) {
                case SpecialItemType.LINE_H:
                    for (let c = 0; c < GRID_COLS; c++) {
                        effectCells.push({ row: itemPos.row, col: c });
                    }
                    break;
                case SpecialItemType.LINE_V:
                    for (let r = 0; r < GRID_ROWS; r++) {
                        effectCells.push({ row: r, col: itemPos.col });
                    }
                    break;
                case SpecialItemType.BOMB:
                    for (let rOffset = -BOMB_EFFECT_RADIUS; rOffset <= BOMB_EFFECT_RADIUS; rOffset++) {
                        for (let cOffset = -BOMB_EFFECT_RADIUS; cOffset <= BOMB_EFFECT_RADIUS; cOffset++) {
                            const R = itemPos.row + rOffset;
                            const C = itemPos.col + cOffset;
                            if (R >= 0 && R < GRID_ROWS && C >= 0 && C < GRID_COLS) {
                                effectCells.push({ row: R, col: C });
                            }
                        }
                    }
                    break;
                case SpecialItemType.SCREEN_CLEAR:
                    for (let r = 0; r < GRID_ROWS; r++) {
                        for (let c = 0; c < GRID_COLS; c++) {
                            if(this.grid[r]?.[c]) {
                                effectCells.push({ row: r, col: c });
                            }
                        }
                    }
                    break;
                case SpecialItemType.CROSS_CLEAR:
                    for (let c = 0; c < GRID_COLS; c++) {
                        if (!effectCells.some(p => p.row === itemPos.row && p.col === c)) {
                            effectCells.push({ row: itemPos.row, col: c });
                        }
                    }
                    for (let r = 0; r < GRID_ROWS; r++) {
                        if (!effectCells.some(p => p.row === r && p.col === itemPos.col)) {
                            effectCells.push({ row: r, col: itemPos.col });
                        }
                    }
                    break;
            }
            return effectCells;
        }

        /** 현재 그리드 상태를 전체적으로 분석하여 모든 매치를 찾아냅니다. */
        analyzeGridState(currentGrid) {
            const result = { positionsToClear: new Set(), specialsToCreate: [], specialsToActivate: [],};
            const processedCells = new Set();
            const addMatchToProcessed = (matchPositions, specialCreatedAtIndex = -1) => {
                matchPositions.forEach((p, index) => {
                    processedCells.add(posToString(p));
                    if (index !== specialCreatedAtIndex) { result.positionsToClear.add(posToString(p)); }
                });
            };
            
            // ... (분석 로직은 매우 길고 복잡하므로 이전과 동일하게 유지)
            for (let r = 0; r < GRID_ROWS; r++) {
                if (!currentGrid || !currentGrid[r]) continue;
                for (let c = 0; c < GRID_COLS - 4; c++) {
                    if (processedCells.has(posToString({row: r, col: c}))) continue;
                    const item = currentGrid[r][c]; if (!item) continue;
                    const matchPositions = [{row: r, col: c}];
                    for (let k = 1; k < 5; k++) { if (c + k < GRID_COLS && currentGrid[r][c+k]?.type === item.type) matchPositions.push({row:r, col:c+k}); else break;}
                    if (matchPositions.length === 5 && matchPositions.every(p => !processedCells.has(posToString(p)))) {
                        const specialIndex = 2; result.specialsToCreate.push({ pos: matchPositions[specialIndex], type: SpecialItemType.SCREEN_CLEAR, originalItem: { ...currentGrid[matchPositions[specialIndex].row][matchPositions[specialIndex].col] } });
                        addMatchToProcessed(matchPositions, specialIndex);
                    }
                }
            }
            for (let c = 0; c < GRID_COLS; c++) {
                for (let r = 0; r < GRID_ROWS - 4; r++) {
                   if (processedCells.has(posToString({row: r, col: c}))) continue;
                    const item = currentGrid[r]?.[c]; if (!item) continue;
                    const matchPositions = [{row: r, col: c}];
                    for (let k = 1; k < 5; k++) { if (r + k < GRID_ROWS && currentGrid[r+k]?.[c]?.type === item.type) matchPositions.push({row:r+k, col:c}); else break; }
                    if (matchPositions.length === 5 && matchPositions.every(p => !processedCells.has(posToString(p)))) {
                        const specialIndex = 2; result.specialsToCreate.push({ pos: matchPositions[specialIndex], type: SpecialItemType.SCREEN_CLEAR, originalItem: { ...currentGrid[matchPositions[specialIndex].row][matchPositions[specialIndex].col] } });
                        addMatchToProcessed(matchPositions, specialIndex);
                    }
                }
            }
            for (let r = 0; r < GRID_ROWS; r++) {
                if (!currentGrid || !currentGrid[r]) continue;
                for (let c = 0; c < GRID_COLS; c++) {
                    if (processedCells.has(posToString({row:r, col:c}))) continue;
                    const centerItem = currentGrid[r][c]; if (!centerItem) continue;
                    const hLine3 = [{row:r, col:c-1}, {row:r, col:c}, {row:r, col:c+1}].filter(p=> p.col >=0 && p.col < GRID_COLS && currentGrid[p.row]?.[p.col]?.type === centerItem.type);
                    const vLine3 = [{row:r-1, col:c}, {row:r, col:c}, {row:r+1, col:c}].filter(p=> p.row >=0 && p.row < GRID_ROWS && currentGrid[p.row]?.[p.col]?.type === centerItem.type);
                    if (hLine3.length === 3 && vLine3.length === 3) {
                        const matchPositions = [...new Set([...hLine3, ...vLine3].map(posToString))].map(stringToPos);
                        if (matchPositions.length === 5 && matchPositions.every(p => !processedCells.has(posToString(p)) && currentGrid[p.row]?.[p.col]?.type === centerItem.type)) {
                            result.specialsToCreate.push({ pos: {row:r, col:c}, type: SpecialItemType.CROSS_CLEAR, originalItem: {...centerItem}});
                            addMatchToProcessed(matchPositions, matchPositions.findIndex(p => p.row ===r && p.col === c)); continue; 
                        }
                    }
                     const LPatterns = [ [[{row:r,col:c}, {row:r+1,col:c}, {row:r+2,col:c}], [{row:r,col:c}, {row:r,col:c+1}, {row:r,col:c+2}]], [[{row:r,col:c}, {row:r+1,col:c}, {row:r+2,col:c}], [{row:r,col:c}, {row:r,col:c-1}, {row:r,col:c-2}]], [[{row:r,col:c}, {row:r-1,col:c}, {row:r-2,col:c}], [{row:r,col:c}, {row:r,col:c+1}, {row:r,col:c+2}]], [[{row:r,col:c}, {row:r-1,col:c}, {row:r-2,col:c}], [{row:r,col:c}, {row:r,col:c-1}, {row:r,col:c-2}]], ];
                    for (const pattern of LPatterns) {
                        const line1Positions = pattern[0].filter(p => p.row >= 0 && p.row < GRID_ROWS && p.col >= 0 && p.col < GRID_COLS && currentGrid[p.row]?.[p.col]?.type === centerItem.type);
                        const line2Positions = pattern[1].filter(p => p.row >= 0 && p.row < GRID_ROWS && p.col >= 0 && p.col < GRID_COLS && currentGrid[p.row]?.[p.col]?.type === centerItem.type);
                        if (line1Positions.length === 3 && line2Positions.length === 3) {
                            const combined = [...new Set([...line1Positions, ...line2Positions].map(posToString))].map(stringToPos);
                            if (combined.length === 5 && combined.every(p => !processedCells.has(posToString(p)))) {
                                 result.specialsToCreate.push({ pos: {row:r, col:c}, type: SpecialItemType.CROSS_CLEAR, originalItem: {...centerItem} });
                                 addMatchToProcessed(combined, combined.findIndex(p => p.row === r && p.col === c)); break; 
                            }
                        }
                    }
                }
            }
            for (let r = 0; r < GRID_ROWS - 1; r++) {
                if (!currentGrid || !currentGrid[r] || !currentGrid[r+1]) continue;
                for (let c = 0; c < GRID_COLS - 1; c++) {
                    const item = currentGrid[r][c]; if (!item || processedCells.has(posToString({row:r, col:c}))) continue;
                    const matchPositions = [{row:r,col:c}, {row:r,col:c+1}, {row:r+1,col:c}, {row:r+1,col:c+1}];
                    if (matchPositions.every(p => currentGrid[p.row]?.[p.col]?.type === item.type && !processedCells.has(posToString(p)))) {
                        result.specialsToCreate.push({ pos: {row:r, col:c}, type: SpecialItemType.BOMB, originalItem: { ...item } });
                        addMatchToProcessed(matchPositions, 0); 
                    }
                }
            }
            for (let r = 0; r < GRID_ROWS; r++) {
                 if (!currentGrid || !currentGrid[r]) continue;
                for (let c = 0; c < GRID_COLS - 3; c++) {
                    if (processedCells.has(posToString({row:r, col:c}))) continue;
                    const item = currentGrid[r][c]; if (!item) continue;
                    const matchPositions = [{row:r, col:c}];
                    for (let k=1; k<4; k++) if(c+k < GRID_COLS && currentGrid[r][c+k]?.type === item.type) matchPositions.push({row:r, col:c+k}); else break;
                    if (matchPositions.length === 4 && matchPositions.every(p => !processedCells.has(posToString(p)))) {
                        const specialIndex = matchPositions.findIndex(p => !currentGrid[p.row][p.col]?.special);
                        const actualSpecialIndex = specialIndex !== -1 ? specialIndex : 0; result.specialsToCreate.push({ pos: matchPositions[actualSpecialIndex], type: SpecialItemType.LINE_H, originalItem: { ...currentGrid[matchPositions[actualSpecialIndex].row][matchPositions[actualSpecialIndex].col] }});
                        addMatchToProcessed(matchPositions, actualSpecialIndex);
                    }
                }
            }
             for (let c = 0; c < GRID_COLS; c++) {
                for (let r = 0; r < GRID_ROWS - 3; r++) {
                    if (processedCells.has(posToString({row:r, col:c}))) continue;
                    const item = currentGrid[r]?.[c]; if (!item) continue;
                    const matchPositions = [{row:r, col:c}];
                    for (let k=1; k<4; k++) if(r+k < GRID_ROWS && currentGrid[r+k]?.[c]?.type === item.type) matchPositions.push({row:r+k, col:c}); else break;
                    if (matchPositions.length === 4 && matchPositions.every(p => !processedCells.has(posToString(p)))) {
                         const specialIndex = matchPositions.findIndex(p => !currentGrid[p.row][p.col]?.special);
                         const actualSpecialIndex = specialIndex !== -1 ? specialIndex : 0; result.specialsToCreate.push({ pos: matchPositions[actualSpecialIndex], type: SpecialItemType.LINE_V, originalItem: { ...currentGrid[matchPositions[actualSpecialIndex].row][matchPositions[actualSpecialIndex].col] }});
                         addMatchToProcessed(matchPositions, actualSpecialIndex);
                    }
                }
            }
            for (let r = 0; r < GRID_ROWS; r++) {
                if (!currentGrid || !currentGrid[r]) continue;
                for (let c = 0; c < GRID_COLS - 2; c++) {
                    if (processedCells.has(posToString({row:r, col:c}))) continue;
                    const item = currentGrid[r][c]; if (!item) continue;
                    const matchPositions = [{row:r,col:c}];
                    for(let k=1; k<3; k++) if(c+k < GRID_COLS && currentGrid[r][c+k]?.type === item.type) matchPositions.push({row:r,col:c+k}); else break;
                    if (matchPositions.length === 3 && matchPositions.every(p => !processedCells.has(posToString(p)))) { addMatchToProcessed(matchPositions); }
                }
            }
            for (let c = 0; c < GRID_COLS; c++) {
                for (let r = 0; r < GRID_ROWS - 2; r++) {
                   if (processedCells.has(posToString({row:r, col:c}))) continue;
                    const item = currentGrid[r]?.[c]; if (!item) continue;
                    const matchPositions = [{row:r,col:c}];
                    for(let k=1; k<3; k++) if(r+k < GRID_ROWS && currentGrid[r+k]?.[c]?.type === item.type) matchPositions.push({row:r+k,col:c}); else break;
                     if (matchPositions.length === 3 && matchPositions.every(p => !processedCells.has(posToString(p)))) { addMatchToProcessed(matchPositions); }
                }
            }
            result.positionsToClear.forEach(posStr => {
                const pos = stringToPos(posStr);
                const item = currentGrid[pos.row]?.[pos.col];
                if (item?.special !== undefined && 
                    !result.specialsToCreate.some(spc => spc.pos.row === pos.row && spc.pos.col === pos.col) && 
                    !result.specialsToActivate.some(sa => sa.pos.row === pos.row && sa.pos.col === pos.col)) { 
                    const effectCells = this.getSpecialEffectCells(pos, item.special);
                    result.specialsToActivate.push({ pos, type: item.special, effectCells, originalItem: {...item} });
                }
            });
            return result;
        }

        /** 분석 결과를 바탕으로 실제 게임 액션 처리를 시작합니다. */
        processGameActions(analysisResult, triggeredByClickPos) {
            let anActionLedToAnimationOrGridChange = false;
            const { specialsToCreate } = analysisResult;
            let finalPositionsToClear = new Set(analysisResult.positionsToClear);
            let allActivatedSpecials = [...analysisResult.specialsToActivate];
            specialsToCreate.forEach(sp => {
                const itemAtPos = this.grid[sp.pos.row]?.[sp.pos.col];
                if (itemAtPos) { 
                    this.grid[sp.pos.row][sp.pos.col] = { ...sp.originalItem, id: itemAtPos.id, special: sp.type,};
                    finalPositionsToClear.delete(posToString(sp.pos)); anActionLedToAnimationOrGridChange = true;
                }
            });
            const alreadyActivatedThisTurn = new Set(); 
            if(triggeredByClickPos) { 
              const clickedItem = this.grid[triggeredByClickPos.row][triggeredByClickPos.col];
              if(clickedItem?.special !== undefined && !allActivatedSpecials.find(sa => sa.pos.row === triggeredByClickPos.row && sa.pos.col === triggeredByClickPos.col)) {
                 const effectCells = this.getSpecialEffectCells(triggeredByClickPos, clickedItem.special);
                 allActivatedSpecials.unshift({pos: triggeredByClickPos, type: clickedItem.special, effectCells, originalItem: {...clickedItem}});
              }
            }
            let currentActivations = [...allActivatedSpecials]; let cascadeIterations = 0; const MAX_CASCADE_ITERATIONS = GRID_ROWS * GRID_COLS; 
            while (currentActivations.length > 0 && cascadeIterations < MAX_CASCADE_ITERATIONS) {
                cascadeIterations++;
                const nextWaveActivations = [];
                currentActivations.forEach(sa => {
                    const activationKey = `${posToString(sa.pos)}-${sa.type}`;
                    if (alreadyActivatedThisTurn.has(activationKey)) return;
                    anActionLedToAnimationOrGridChange = true; alreadyActivatedThisTurn.add(activationKey); finalPositionsToClear.add(posToString(sa.pos)); 
                    sa.effectCells.forEach(effectPos => { 
                         finalPositionsToClear.add(posToString(effectPos));
                         const itemAtEffectPos = this.grid[effectPos.row]?.[effectPos.col];
                         if (itemAtEffectPos?.special !== undefined && !alreadyActivatedThisTurn.has(`${posToString(effectPos)}-${itemAtEffectPos.special}`)) {
                             const nextEffectCells = this.getSpecialEffectCells(effectPos, itemAtEffectPos.special);
                             const newActivation = { pos: effectPos, type: itemAtEffectPos.special, effectCells: nextEffectCells, originalItem: {...itemAtEffectPos} };
                             if(!nextWaveActivations.some(nwa => nwa.pos.row === newActivation.pos.row && nwa.pos.col === newActivation.pos.col && nwa.type === newActivation.type)) {
                               nextWaveActivations.push(newActivation);
                               if(!allActivatedSpecials.some(aas => aas.pos.row === newActivation.pos.row && aas.pos.col === newActivation.pos.col && aas.type === newActivation.type)) { allActivatedSpecials.push(newActivation); }
                             }
                         }
                    });
                });
                currentActivations = nextWaveActivations;
            }
            if (alreadyActivatedThisTurn.size > 0) {
                this.animationState = { 
                    type: 'special_activating', activationDetails: allActivatedSpecials.filter(sa => alreadyActivatedThisTurn.has(`${posToString(sa.pos)}-${sa.type}`)), 
                    startTime: Date.now(), processedActivations: new Set(), allCellsToClearAfterSpecialActivation: finalPositionsToClear
                };
            } else if (finalPositionsToClear.size > 0) {
                anActionLedToAnimationOrGridChange = true;
                const clearedPositions = Array.from(finalPositionsToClear).map(stringToPos);
                this.incrementCombo(clearedPositions);
                const scoreMultiplier = this.comboCount > 1 ? 1 + (this.comboCount - 1) * 0.5 : 1;
                const pointsEarned = Math.round(finalPositionsToClear.size * POINTS_PER_ITEM * scoreMultiplier);
                this.updateScore(this.score + pointsEarned);
                this.animationState = { type: 'matching', items: clearedPositions, startTime: Date.now() };
            }
            return anActionLedToAnimationOrGridChange;
        }

        /** 게임의 다음 단계를 처리하는 로직입니다. */
        handleNextStepInGameLogic() {
            if (this.animationState.type !== 'idle' || this.isShufflingBoard || this.isProcessingMove) return;
            const analysisResult = this.analyzeGridState(this.grid);
            const actionsProcessed = this.processGameActions(analysisResult);
            if (!actionsProcessed) { 
                this.endCombo(); this.isProcessingMove = false;
                if (!this.checkPossibleMoves()) {
                    if (this.hasShuffledRecently) {
                        this.showGameOverMessage(true); this.hasShuffledRecently = false;
                    } else {
                        this.isShufflingBoard = true; this.showShuffleMessage(true);
                        this.hintToDisplay = null; if(this.hintTimerId) clearTimeout(this.hintTimerId);
                        setTimeout(() => { if (this.shuffleBoard) this.shuffleBoard(); }, SHUFFLE_DELAY);
                    }
                } else {
                    this.hasShuffledRecently = false; this.lastInteractionTime = Date.now();
                    if(this.hintTimerId) clearTimeout(this.hintTimerId); this.hintToDisplay = null;
                    this.hintTimerId = setTimeout(() => { this.hintToDisplay = this.findHint(); }, HINT_DELAY);
                }
            }
        }

        /** 게임 시작 시 그리드를 생성합니다. */
        initializeGridAndLogic() {
            this.isShufflingBoard = false; this.hasShuffledRecently = false; this.showShuffleMessage(false); this.isProcessingMove = true; 
            let newGrid = [];
            for (let r = 0; r < GRID_ROWS; r++) {
              newGrid[r] = [];
              for (let c = 0; c < GRID_COLS; c++) {
                let excludedTypes = [];
                if (c >= 2 && newGrid[r][c-1]?.type === newGrid[r][c-2]?.type) if(newGrid[r][c-1]) excludedTypes.push(newGrid[r][c-1].type);
                if (r >= 2 && newGrid[r-1][c]?.type === newGrid[r-2][c]?.type) if(newGrid[r-1][c]) excludedTypes.push(newGrid[r-1][c].type);
                newGrid[r][c] = this.createRandomItem(excludedTypes);
              }
            }
            this.grid = newGrid;
            let initialAnalysis; let attempts = 0; const MAX_INIT_FIX_ATTEMPTS = 10;
            do {
                initialAnalysis = this.analyzeGridState(this.grid);
                if (initialAnalysis.positionsToClear.size > 0 || initialAnalysis.specialsToCreate.length > 0 || initialAnalysis.specialsToActivate.length > 0) {
                    for (let r_ = 0; r_ < GRID_ROWS; r_++) for (let c_ = 0; c_ < GRID_COLS; c_++) this.grid[r_][c_] = this.createRandomItem();
                }
                attempts++;
            } while ((initialAnalysis.positionsToClear.size > 0 || initialAnalysis.specialsToCreate.length > 0 || initialAnalysis.specialsToActivate.length > 0) && attempts < MAX_INIT_FIX_ATTEMPTS);
            this.updateScore(0); this.animationState = { type: 'idle' }; this.isProcessingMove = false; 
            this.handleNextStepInGameLogic();
        }

        // =========================================================================
        // --- [수정] 누락된 핵심 로직 함수 추가 ---
        // =========================================================================

        /**
         * 매치된 아이템들을 그리드에서 제거(null로 설정)합니다.
         * @param {Array<{row: number, col: number}>} itemsToRemove - 제거할 아이템들의 위치 배열
         */
        removeMatchedItemsFromGrid(itemsToRemove) {
            itemsToRemove.forEach(pos => {
                if (this.grid[pos.row] && this.grid[pos.row][pos.col] !== null) {
                    this.grid[pos.row][pos.col] = null;
                }
            });
        }

        /**
         * 그리드에 중력을 적용하여 아이템들을 아래로 떨어뜨립니다.
         * @returns {{newFallingItems: Array}} - 애니메이션을 위해 떨어지는 아이템 정보 배열
         */
        applyGravityToGrid() {
            const newFallingItems = [];
            // 각 열(column)을 아래에서부터 위로 확인합니다.
            for (let c = 0; c < GRID_COLS; c++) {
                let emptyRow = -1; // 해당 열에서 가장 높은 빈 공간의 행 인덱스

                // 열의 가장 아래 행부터 위로 올라가면서 검사합니다.
                for (let r = GRID_ROWS - 1; r >= 0; r--) {
                    if (this.grid[r][c] === null && emptyRow === -1) {
                        // 처음으로 발견된 빈 공간을 기록합니다.
                        emptyRow = r;
                    } else if (this.grid[r][c] !== null && emptyRow !== -1) {
                        // 빈 공간 위에 아이템이 있다면, 그 아이템을 빈 공간으로 이동시킵니다.
                        const itemToFall = this.grid[r][c];
                        this.grid[emptyRow][c] = itemToFall;
                        this.grid[r][c] = null;

                        // 애니메이션을 위해 어떤 아이템이 어디서 어디로 떨어지는지 기록합니다.
                        newFallingItems.push({
                            item: itemToFall,
                            col: c,
                            fromY: r * CELL_SIZE,
                            currentY: r * CELL_SIZE,
                            toY: emptyRow * CELL_SIZE,
                            landed: false
                        });

                        // 다음 빈 공간은 방금 채운 곳의 바로 위가 됩니다.
                        emptyRow--;
                    }
                }
            }
            return { newFallingItems };
        }

        /**
         * 그리드의 빈 공간을 새로운 아이템으로 채웁니다.
         * @returns {{newRefillingItems: Array}} - 애니메이션을 위해 새로 채워지는 아이템 정보 배열
         */
        refillGridWithNewItems() {
            const newRefillingItems = [];
            // 각 열을 순회하며 빈 공간이 있는지 확인합니다.
            for (let c = 0; c < GRID_COLS; c++) {
                let refillCount = 0;
                // 열의 아래부터 위로 확인하여 빈 공간(null)을 찾습니다.
                for (let r = GRID_ROWS - 1; r >= 0; r--) {
                    if (this.grid[r][c] === null) {
                        refillCount++;
                        const newItem = this.createRandomItem();
                        this.grid[r][c] = newItem;

                        // 애니메이션을 위해 새로 생성된 아이템의 정보를 기록합니다.
                        // 아이템은 화면 밖(-y 좌표)에서 시작하여 제자리로 떨어집니다.
                        newRefillingItems.push({
                            item: newItem,
                            col: c,
                            fromY: (-refillCount) * CELL_SIZE,
                            currentY: (-refillCount) * CELL_SIZE,
                            toY: r * CELL_SIZE,
                            landed: false
                        });
                    }
                }
            }
            return { newRefillingItems };
        }

        // =========================================================================
        // --- [수정] 누락된 함수 추가 (힌트 및 이동 가능 여부 체크) ---
        // =========================================================================
        
        /**
         * 게임 보드에 더 이상 움직일 수 있는 조합이 있는지 확인합니다.
         * @returns {boolean} 가능한 움직임이 있으면 true, 없으면 false를 반환합니다.
         */
        checkPossibleMoves() {
            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    const item1 = this.grid[r][c];
                    if (!item1) continue;

                    // 오른쪽 아이템과 교환 테스트
                    if (c < GRID_COLS - 1) {
                        const item2 = this.grid[r][c + 1];
                        if (item2 && this.wouldSwapCreateMatch({row: r, col: c}, {row: r, col: c + 1})) {
                            return true;
                        }
                    }

                    // 아래쪽 아이템과 교환 테스트
                    if (r < GRID_ROWS - 1) {
                        const item2 = this.grid[r + 1][c];
                        if (item2 && this.wouldSwapCreateMatch({row: r, col: c}, {row: r + 1, col: c})) {
                            return true;
                        }
                    }
                }
            }
            return false; // 모든 조합을 확인했지만 가능한 움직임이 없음
        }

        /**
         * 플레이어에게 보여줄 힌트를 찾습니다.
         * @returns {Array|null} 힌트로 보여줄 두 아이템의 위치 배열 [{row, col}, {row, col}] 또는 힌트가 없으면 null을 반환합니다.
         */
        findHint() {
            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    // 오른쪽 아이템과 교환하여 힌트 찾기
                    if (c < GRID_COLS - 1) {
                        if (this.wouldSwapCreateMatch({row: r, col: c}, {row: r, col: c + 1})) {
                            return [{row: r, col: c}, {row: r, col: c + 1}];
                        }
                    }
                    // 아래쪽 아이템과 교환하여 힌트 찾기
                    if (r < GRID_ROWS - 1) {
                        if (this.wouldSwapCreateMatch({row: r, col: c}, {row: r + 1, col: c})) {
                            return [{row: r, col: c}, {row: r + 1, col: c}];
                        }
                    }
                }
            }
            return null; // 힌트 없음
        }

        /**
         * 두 아이템을 가상으로 교환했을 때 매치가 발생하는지 확인하는 헬퍼 함수입니다.
         * @param {{row: number, col: number}} pos1 첫 번째 아이템 위치
         * @param {{row: number, col: number}} pos2 두 번째 아이템 위치
         * @returns {boolean} 매치가 발생하면 true, 아니면 false를 반환합니다.
         */
        wouldSwapCreateMatch(pos1, pos2) {
            // 그리드를 복사하지 않고, 타입만 임시로 바꿔서 확인
            const tempGrid = this.grid.map(row => row.map(item => (item ? { ...item } : null)));
            const item1 = tempGrid[pos1.row][pos1.col];
            const item2 = tempGrid[pos2.row][pos2.col];

            // 가상으로 교환
            tempGrid[pos1.row][pos1.col] = item2;
            tempGrid[pos2.row][pos2.col] = item1;

            // `analyzeGridState`를 사용하여 교환 후 상태 분석
            const analysis = this.analyzeGridState(tempGrid);

            // 매치가 발생하거나, 특수 아이템이 생성/활성화되면 유효한 움직임으로 간주
            return analysis.positionsToClear.size > 0 || analysis.specialsToCreate.length > 0 || analysis.specialsToActivate.length > 0;
        }

        // --- 이벤트 핸들러 구현부 ---

        /** 사용자가 상호작용할 때 호출됩니다. */
        triggerPlayerAction() {
            this.lastInteractionTime = Date.now();
            if(this.hintTimerId) { clearTimeout(this.hintTimerId); }
            this.hintToDisplay = null;
        }

        /** 특수 아이템을 클릭/탭했을 때 발동시킵니다. */
        activateSpecialItemOnClick(row, col) {
            if (this.isProcessingMove || this.animationState.type !== 'idle' || this.isShufflingBoard) return;
            const item = this.grid[row]?.[col];
            if (!item || item.special === undefined) return;
            this.triggerPlayerAction();
            this.isProcessingMove = true;
            this.endCombo();
            const clickAnalysis = { positionsToClear: new Set(), specialsToCreate: [], specialsToActivate: [] };
            const actionsProcessed = this.processGameActions(clickAnalysis, {row, col});
            if (!actionsProcessed) {
                this.isProcessingMove = false;
            }
        }

        /** 마우스/터치 이벤트로부터 캔버스 내 좌표를 추출합니다. */
        getCoordsFromEvent(event) {
            const rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;

            if (event.type.startsWith('touch')) {
                if (event.changedTouches && event.changedTouches.length > 0) {
                    clientX = event.changedTouches[0].clientX;
                    clientY = event.changedTouches[0].clientY;
                } else {
                    return null;
                }
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }

            const x = clientX - rect.left;
            const y = clientY - rect.top;
            const col = Math.floor(x / CELL_SIZE); 
            const row = Math.floor(y / CELL_SIZE);
            return { row, col, x, y };
        }

        /** 마우스 다운 또는 터치 시작 이벤트 핸들러입니다. */
        handleMouseDown(event) {
            if (event.type.startsWith('touch')) { event.preventDefault(); }
            if (this.isProcessingMove || this.animationState.type !== 'idle' || this.isShufflingBoard) return;
            this.endCombo();
            const coords = this.getCoordsFromEvent(event);
            if (!coords) return;
            const { row, col, x, y } = coords;
            if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS && this.grid[row]?.[col]) {
              this.startDragCell = { row, col };
              this.clickStartPos = {row, col};
              this.draggedItemMousePos = { x , y };
              this.isDragging = true;
              this.potentialClick = true;
              this.lastFailedSwapTarget = null;
            }
        }
        
        /** 마우스 이동 또는 터치 이동 이벤트 핸들러입니다. */
        handleMouseMove(event) {
            if (!this.isDragging) return;
            if (event.type.startsWith('touch')) { event.preventDefault(); }
            const coords = this.getCoordsFromEvent(event);
            if (!coords) return;
            this.draggedItemMousePos = { x: coords.x, y: coords.y };
            if (this.potentialClick && this.clickStartPos && (coords.row !== this.clickStartPos.row || coords.col !== this.clickStartPos.col)) {
                this.potentialClick = false;
                this.triggerPlayerAction();
            }
            if (this.isProcessingMove || this.animationState.type !== 'idle') return;
            const startPos = this.startDragCell;
            if (coords.row >= 0 && coords.row < GRID_ROWS && coords.col >= 0 && coords.col < GRID_COLS && (coords.row !== startPos.row || coords.col !== startPos.col)) {
                const dr = Math.abs(coords.row - startPos.row);
                const dc = Math.abs(coords.col - startPos.col);
                if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
                    if (!this.lastFailedSwapTarget || this.lastFailedSwapTarget.row !== coords.row || this.lastFailedSwapTarget.col !== coords.col) {
                        this.potentialClick = false;
                        const item1 = this.grid[startPos.row]?.[startPos.col];
                        const item2 = this.grid[coords.row]?.[coords.col];
                        if (item1 && item2) {
                            this.isProcessingMove = true;
                            this.triggerPlayerAction();
                            this.animationState = {
                                type: 'attempting_swap', startTime: Date.now(),
                                attemptingSwapDetail: {
                                    item1: {...item1}, item2: {...item2}, pos1Start: startPos, pos2Start: {row: coords.row, col: coords.col},
                                    item1TargetX: coords.col * CELL_SIZE, item1TargetY: coords.row * CELL_SIZE,
                                    item2TargetX: startPos.col * CELL_SIZE, item2TargetY: startPos.row * CELL_SIZE,
                                    item1CurrentX: startPos.col * CELL_SIZE, item1CurrentY: startPos.row * CELL_SIZE,
                                    item2CurrentX: coords.col * CELL_SIZE, item2CurrentY: coords.row * CELL_SIZE,
                                    isDragSwap: true, draggedItemOriginalId: item1.id,
                                }
                            };
                        }
                    }
                } else { this.lastFailedSwapTarget = null; }
            } else { this.lastFailedSwapTarget = null; }
        }

        /** 마우스 업 또는 터치 종료 이벤트 핸들러입니다. */
        handleMouseUp(event) {
            if (this.potentialClick && this.clickStartPos && !this.isShufflingBoard && this.animationState.type === 'idle' && !this.isProcessingMove) {
                const coords = this.getCoordsFromEvent(event);
                if (coords && this.clickStartPos.row === coords.row && this.clickStartPos.col === coords.col) {
                    const item = this.grid[coords.row]?.[coords.col];
                    if (item?.special !== undefined) {
                        this.activateSpecialItemOnClick(coords.row, coords.col);
                    }
                }
            }
            this.isDragging = false;
            this.potentialClick = false;
            this.clickStartPos = null;
            if (!this.isProcessingMove && this.animationState.type === 'idle' && !this.isShufflingBoard) {
                this.handleNextStepInGameLogic();
            }
        }
        
        // --- 애니메이션 및 렌더링 구현부 ---

        /** 모든 애니메이션 상태를 시간의 흐름에 따라 한 프레임 진행시킵니다. */
        advanceAnimations() {
            const animState = this.animationState;
            if (animState.type === 'idle') return true; 
            let animationCompletedThisFrame = false;
            if (animState.type === 'attempting_swap' && animState.attemptingSwapDetail) {
                const detail = animState.attemptingSwapDetail;
                const elapsed = Date.now() - animState.startTime;
                const progress = Math.min(1, elapsed / ATTEMPTING_SWAP_ANIMATION_DURATION);
                detail.item1CurrentX = detail.pos1Start.col * CELL_SIZE + (detail.item1TargetX - detail.pos1Start.col * CELL_SIZE) * progress;
                detail.item1CurrentY = detail.pos1Start.row * CELL_SIZE + (detail.item1TargetY - detail.pos1Start.row * CELL_SIZE) * progress;
                detail.item2CurrentX = detail.pos2Start.col * CELL_SIZE + (detail.item2TargetX - detail.pos2Start.col * CELL_SIZE) * progress;
                detail.item2CurrentY = detail.pos2Start.row * CELL_SIZE + (detail.item2TargetY - detail.pos2Start.row * CELL_SIZE) * progress;
                if (progress >= 1) {
                    const item1 = detail.item1; const item2 = detail.item2; 
                    if (item1 && item2) {
                        this.grid[detail.pos1Start.row][detail.pos1Start.col] = item2;
                        this.grid[detail.pos2Start.row][detail.pos2Start.col] = item1;
                        const analysisResult = this.analyzeGridState(this.grid);
                        const actionsProcessed = this.processGameActions(analysisResult);
                        if (actionsProcessed) { 
                            if (detail.isDragSwap) {
                                let newPosOfDragged = null;
                                for(let r=0; r<GRID_ROWS; r++) for(let c=0; c<GRID_COLS; c++) {
                                    if(this.grid[r][c]?.id === detail.draggedItemOriginalId) { newPosOfDragged = {row:r, col:c}; break; }
                                }
                                if(newPosOfDragged) this.startDragCell = newPosOfDragged; else this.startDragCell = detail.pos2Start;
                                this.lastFailedSwapTarget = null;
                            }
                             if(this.animationState.type === 'attempting_swap') { this.animationState = {type: 'idle'}; animationCompletedThisFrame = true; }
                        } else { 
                            this.grid[detail.pos1Start.row][detail.pos1Start.col] = item1;
                            this.grid[detail.pos2Start.row][detail.pos2Start.col] = item2;
                            this.animationState = {
                                type: 'invalid_swap',
                                animatedSwapItems: [
                                  { item: item1, startX: detail.item1TargetX, startY: detail.item1TargetY, currentX: detail.item1TargetX, currentY: detail.item1TargetY, endX: detail.pos1Start.col * CELL_SIZE, endY: detail.pos1Start.row * CELL_SIZE, originalGridPos: detail.pos1Start },
                                  { item: item2, startX: detail.item2TargetX, startY: detail.item2TargetY, currentX: detail.item2TargetX, currentY: detail.item2TargetY, endX: detail.pos2Start.col * CELL_SIZE, endY: detail.pos2Start.row * CELL_SIZE, originalGridPos: detail.pos2Start }
                                ],
                                startTime: Date.now(),
                            };
                            if (detail.isDragSwap) this.lastFailedSwapTarget = detail.pos2Start; 
                        }
                    } else { this.animationState = { type: 'idle' }; animationCompletedThisFrame = true; }
                }
            } else if (animState.type === 'special_activating') {
                const elapsed = Date.now() - animState.startTime;
                const progress = Math.min(1, elapsed / SPECIAL_ACTIVATION_ANIMATION_DURATION);
                let allEffectsVisuallyDone = true;
                animState.activationDetails?.forEach(detail => {
                    const key = `${posToString(detail.pos)}-${detail.type}`;
                    if (!animState.processedActivations?.has(key)) {
                        allEffectsVisuallyDone = false;
                        if (progress >=1) animState.processedActivations?.add(key);
                    }
                });
                if (allEffectsVisuallyDone || progress >=1) { 
                    const cellsToPassToMatching = animState.allCellsToClearAfterSpecialActivation || new Set();
                    if (cellsToPassToMatching.size > 0) {
                         const clearedPositions = Array.from(cellsToPassToMatching).map(stringToPos);
                         this.incrementCombo(clearedPositions);
                         const scoreMultiplier = this.comboCount > 1 ? 1 + (this.comboCount - 1) * 0.5 : 1;
                         const pointsEarned = Math.round(cellsToPassToMatching.size * POINTS_PER_ITEM * scoreMultiplier);
                         this.updateScore(this.score + pointsEarned);
                         this.animationState = { type: 'matching', items: clearedPositions, startTime: Date.now() };
                    } else { this.animationState = { type: 'idle' }; animationCompletedThisFrame = true; }
                }
            } else if (animState.type === 'matching') {
                const elapsed = Date.now() - animState.startTime;
                if (Math.min(1, elapsed / MATCH_ANIMATION_DURATION) >= 1) {
                    this.removeMatchedItemsFromGrid(animState.items);
                    const { newFallingItems } = this.applyGravityToGrid();
                    if (newFallingItems.length > 0) {
                        this.animationState = { type: 'falling', items: newFallingItems, startTime: Date.now() };
                    } else {
                        const { newRefillingItems } = this.refillGridWithNewItems();
                        if (newRefillingItems.length > 0) {
                            this.animationState = { type: 'refilling', items: newRefillingItems, startTime: Date.now() };
                        } else { 
                            this.animationState = { type: 'idle' }; 
                            animationCompletedThisFrame = true; 
                        }
                    }
                }
            } else if (animState.type === 'falling' || animState.type === 'refilling') {
                let allLanded = true;
                const speed = animState.type === 'falling' ? FALL_ANIMATION_SPEED : REFILL_ANIMATION_SPEED;
                animState.items.forEach(item => {
                    if (!item.landed) {
                        item.currentY += speed;
                        if (item.currentY >= item.toY) { item.currentY = item.toY; item.landed = true; } 
                        else allLanded = false;
                    }
                });
                if (allLanded) {
                    if (animState.type === 'falling') {
                        const { newRefillingItems } = this.refillGridWithNewItems();
                        if (newRefillingItems.length > 0) {
                            this.animationState = { type: 'refilling', items: newRefillingItems, startTime: Date.now() };
                        } else { 
                            this.animationState = { type: 'idle' }; 
                            animationCompletedThisFrame = true; 
                        }
                    } else { 
                        this.animationState = { type: 'idle' }; 
                        animationCompletedThisFrame = true; 
                    }
                }
            } else if (animState.type === 'invalid_swap') {
                const elapsed = Date.now() - animState.startTime;
                const progress = Math.min(1, elapsed / INVALID_SWAP_ANIMATION_DURATION);
                let allMovedBack = true;
                animState.animatedSwapItems?.forEach(item => {
                    if (item.currentX !== item.endX || item.currentY !== item.endY) {
                        allMovedBack = false;
                        item.currentX = item.startX + (item.endX - item.startX) * progress;
                        item.currentY = item.startY + (item.endY - item.startY) * progress;
                        if (progress >= 1) { item.currentX = item.endX; item.currentY = item.endY; }
                    }
                });
                if (allMovedBack || progress >= 1) { 
                    this.animationState = { type: 'idle' }; 
                    animationCompletedThisFrame = true; 
                }
            }
            if (animationCompletedThisFrame) {
                this.isProcessingMove = false; 
                this.handleNextStepInGameLogic();
            }
            return this.animationState.type === 'idle';
        }

        /** 개별 아이템을 캔버스에 그리는 함수입니다. */
        drawShape(item, x, y, size, alpha = 1, scale = 1) {
            const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha;
            const actualSize = size * scale; const offset = (size - actualSize) / 2;
            const finalX = x + offset; const finalY = y + offset;
            ctx.fillStyle = item.color; const s = actualSize * 0.8; const p = (actualSize - s) / 2;
            const cx = finalX + actualSize / 2; const cy = finalY + actualSize / 2;
            if (item.special !== undefined) { 
                ctx.strokeStyle = item.color; ctx.fillStyle = item.color; ctx.lineWidth = Math.max(2, actualSize * 0.08); 
                const specialPadding = actualSize * 0.20; 
                switch (item.special) { 
                    case SpecialItemType.LINE_H: {
                        const VSpacing = actualSize * 0.2; ctx.beginPath();
                        ctx.moveTo(finalX + specialPadding, cy - VSpacing); ctx.lineTo(finalX + actualSize - specialPadding, cy - VSpacing);
                        ctx.moveTo(finalX + specialPadding, cy); ctx.lineTo(finalX + actualSize - specialPadding, cy);
                        ctx.moveTo(finalX + specialPadding, cy + VSpacing); ctx.lineTo(finalX + actualSize - specialPadding, cy + VSpacing);
                        ctx.stroke(); break;
                    } case SpecialItemType.LINE_V: {
                        const HSpacing = actualSize * 0.2; ctx.beginPath();
                        ctx.moveTo(cx - HSpacing, finalY + specialPadding); ctx.lineTo(cx - HSpacing, finalY + actualSize - specialPadding);
                        ctx.moveTo(cx, finalY + specialPadding); ctx.lineTo(cx, finalY + actualSize - specialPadding);
                        ctx.moveTo(cx + HSpacing, finalY + specialPadding); ctx.lineTo(cx + HSpacing, finalY + actualSize - specialPadding);
                        ctx.stroke(); break;
                    } case SpecialItemType.BOMB: {
                        ctx.fillStyle = '#4A5568'; ctx.beginPath(); ctx.arc(cx, cy, s / 2 * 0.85, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#A0AEC0'; ctx.fillRect(cx - s * 0.1, cy - s / 2 * 0.85 - s * 0.1, s * 0.2, s * 0.15);
                        ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(cx, cy - s / 2 * 0.85 - s * 0.1 - s*0.05, s * 0.08, 0, Math.PI * 2); ctx.fill(); break;
                    } case SpecialItemType.SCREEN_CLEAR: {
                        const outerR = s * 0.45, innerR = s * 0.2;
                        for (let i = 0; i < 6; i++) {
                            ctx.fillStyle = SHAPE_COLORS[ALL_SHAPE_TYPES[i % ALL_SHAPE_TYPES.length]]; ctx.beginPath();
                            ctx.moveTo(cx, cy); ctx.arc(cx, cy, outerR, (i * Math.PI * 2) / 6, ((i + 1) * Math.PI * 2) / 6);
                            ctx.closePath(); ctx.fill();
                        }
                        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fill(); break;
                    } case SpecialItemType.CROSS_CLEAR: {
                        ctx.fillStyle = item.color; const barWidth = actualSize * 0.25;
                        const barLength = actualSize * 0.7; const barOffset = (actualSize - barLength)/2;
                        ctx.fillRect(finalX + barOffset, cy - barWidth/2, barLength, barWidth);
                        ctx.fillRect(cx - barWidth/2, finalY + barOffset, barWidth, barLength); break;
                    }
                }
            } else {
                switch (item.type) {
                    case ShapeType.CIRCLE: ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, 2 * Math.PI); ctx.fill(); break;
                    case ShapeType.SQUARE: ctx.fillRect(finalX + p, finalY + p, s, s); break;
                    case ShapeType.TRIANGLE: ctx.beginPath(); ctx.moveTo(cx, finalY + p); ctx.lineTo(finalX + p, finalY + p + s); ctx.lineTo(finalX + p + s, finalY + p + s); ctx.closePath(); ctx.fill(); break;
                    case ShapeType.DIAMOND: ctx.beginPath(); ctx.moveTo(cx, finalY + p); ctx.lineTo(finalX + p + s, cy); ctx.lineTo(cx, finalY + p + s); ctx.lineTo(finalX + p, cy); ctx.closePath(); ctx.fill(); break;
                    case ShapeType.HEXAGON: const hr = s / 2; ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(cx + hr * Math.cos(Math.PI/3*i), cy + hr * Math.sin(Math.PI/3*i)); ctx.closePath(); ctx.fill(); break;
                    case ShapeType.STAR: const sp=5, oR=s/2, iR=s/4; let rot=Math.PI/2*3, step=Math.PI/sp; ctx.beginPath(); ctx.moveTo(cx,cy-oR); for (let i=0;i<sp;i++){ctx.lineTo(cx+Math.cos(rot)*oR,cy+Math.sin(rot)*oR); rot+=step; ctx.lineTo(cx+Math.cos(rot)*iR,cy+Math.sin(rot)*iR); rot+=step;} ctx.lineTo(cx,cy-oR); ctx.closePath(); ctx.fill(); break;
                }
            }
            ctx.restore();
        }

        /** 콤보 텍스트를 애니메이션 효과와 함께 캔버스에 그립니다. */
        drawComboText() {
            if (!this.comboTextInfo) return;
            const elapsed = Date.now() - this.comboTextInfo.startTime;
            if (elapsed > COMBO_TEXT_DURATION) { this.comboTextInfo = null; return; }
            const progress = elapsed / COMBO_TEXT_DURATION;
            const alpha = 1 - progress; const scale = 1 + progress * 0.5;
            this.ctx.save(); this.ctx.globalAlpha = alpha; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            const fontSize = 24 * scale;
            this.ctx.font = `bold ${fontSize}px sans-serif`; this.ctx.fillStyle = 'white'; this.ctx.strokeStyle = 'black'; this.ctx.lineWidth = 4;
            this.ctx.strokeText(this.comboTextInfo.text, this.comboTextInfo.x, this.comboTextInfo.y);
            this.ctx.fillText(this.comboTextInfo.text, this.comboTextInfo.x, this.comboTextInfo.y);
            this.ctx.restore();
        }

        /** 매 프레임마다 호출되는 메인 게임 렌더링 루프입니다. */
        gameLoop() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            const isIdleAndNotProcessing = this.advanceAnimations();
            const animState = this.animationState;
            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    const item = this.grid[r]?.[c];
                    if (item) {
                        let hideItem = false;
                        if (animState.type === 'attempting_swap' && ((animState.attemptingSwapDetail.pos1Start.row === r && animState.attemptingSwapDetail.pos1Start.col === c) || (animState.attemptingSwapDetail.pos2Start.row === r && animState.attemptingSwapDetail.pos2Start.col === c))) hideItem = true;
                        else if (animState.type === 'matching' && animState.items.some(p => p.row === r && p.col === c)) hideItem = true;
                        else if ((animState.type === 'falling' || animState.type === 'refilling') && animState.items.some(ai => ai.item.id === item.id)) hideItem = true;
                        else if (animState.type === 'special_activating' && animState.activationDetails?.some(ad => ad.effectCells.some(ec => ec.row ===r && ec.col ===c) || (ad.pos.row === r && ad.pos.col ===c) )) {
                            if(animState.activationDetails?.some(ad => ad.pos.row ===r && ad.pos.col ===c && !animState.processedActivations?.has(`${posToString(ad.pos)}-${ad.type}`))) {} else { hideItem = true; }
                        } else if (animState.type === 'invalid_swap' && animState.animatedSwapItems?.some(asi => asi.originalGridPos.row ===r && asi.originalGridPos.col ===c )) hideItem = true;
                        if (this.isDragging && this.startDragCell?.row === r && this.startDragCell?.col === c && isIdleAndNotProcessing) hideItem = true;
                        if (!hideItem) this.drawShape(item, c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE);
                    }
                }
            }
            if (animState.type === 'attempting_swap' && animState.attemptingSwapDetail) {
                const d = animState.attemptingSwapDetail; this.drawShape(d.item1, d.item1CurrentX, d.item1CurrentY, CELL_SIZE); this.drawShape(d.item2, d.item2CurrentX, d.item2CurrentY, CELL_SIZE);
            } else if (animState.type === 'special_activating') {
                const elapsed = Date.now() - animState.startTime;
                const progress = Math.min(1, elapsed / SPECIAL_ACTIVATION_ANIMATION_DURATION);
                animState.activationDetails?.forEach(detail => {
                    if (animState.processedActivations?.has(`${posToString(detail.pos)}-${detail.type}`)) return; 
                    this.ctx.save();
                    const centerX = detail.pos.col * CELL_SIZE + CELL_SIZE / 2, centerY = detail.pos.row * CELL_SIZE + CELL_SIZE / 2;
                    const activatingItemVisual = this.grid[detail.pos.row]?.[detail.pos.col] || detail.originalItem;
                    switch(detail.type) {
                        case SpecialItemType.LINE_H: case SpecialItemType.LINE_V: case SpecialItemType.CROSS_CLEAR: 
                            this.ctx.fillStyle = activatingItemVisual.color; this.ctx.globalAlpha = 0.7 * (1 - progress); 
                            if (detail.type === SpecialItemType.LINE_H || detail.type === SpecialItemType.CROSS_CLEAR) this.ctx.fillRect(0, detail.pos.row * CELL_SIZE + CELL_SIZE * 0.25, this.canvas.width * progress, CELL_SIZE * 0.5);
                            if (detail.type === SpecialItemType.LINE_V || detail.type === SpecialItemType.CROSS_CLEAR) this.ctx.fillRect(detail.pos.col * CELL_SIZE + CELL_SIZE * 0.25, 0, CELL_SIZE * 0.5, this.canvas.height * progress);
                            break;
                        case SpecialItemType.BOMB:
                            this.ctx.fillStyle = activatingItemVisual.color; this.ctx.globalAlpha = 0.5 * (1 - progress); this.ctx.beginPath();
                            this.ctx.arc(centerX, centerY, CELL_SIZE * (BOMB_EFFECT_RADIUS + 0.5) * progress, 0, Math.PI * 2); this.ctx.fill(); break;
                        case SpecialItemType.SCREEN_CLEAR:
                            this.ctx.fillStyle = activatingItemVisual.color; this.ctx.globalAlpha = 0.4 * (1-progress); this.ctx.beginPath();
                            this.ctx.arc(this.canvas.width/2, this.canvas.height/2, Math.max(this.canvas.width,this.canvas.height) * progress, 0, Math.PI * 2); this.ctx.fill(); break;
                    }
                     this.drawShape(activatingItemVisual, detail.pos.col * CELL_SIZE, detail.pos.row * CELL_SIZE, CELL_SIZE, 1-progress, 1+ (progress*0.2)); 
                    this.ctx.restore();
                });
            } else if (animState.type === 'matching') {
                const elapsed = Date.now() - animState.startTime; const progress = Math.min(1, elapsed / MATCH_ANIMATION_DURATION);
                animState.items.forEach(pos => {
                    const itemToDraw = this.grid[pos.row]?.[pos.col]; 
                    if (itemToDraw) this.drawShape(itemToDraw, pos.col * CELL_SIZE, pos.row * CELL_SIZE, CELL_SIZE, 1 - progress, 1 - progress);
                });
            } else if (animState.type === 'falling' || animState.type === 'refilling') {
                animState.items.forEach(animItem => {
                    if(animItem.item) this.drawShape(animItem.item, animItem.col * CELL_SIZE, animItem.currentY, CELL_SIZE);
                });
            } else if (animState.type === 'invalid_swap') {
                animState.animatedSwapItems?.forEach(asi => this.drawShape(asi.item, asi.currentX, asi.currentY, CELL_SIZE));
            }
            if (this.isDragging && this.startDragCell && this.draggedItemMousePos && isIdleAndNotProcessing) {
              const draggedItem = this.grid[this.startDragCell.row]?.[this.startDragCell.col];
              if (draggedItem) this.drawShape(draggedItem, this.draggedItemMousePos.x - CELL_SIZE / 2, this.draggedItemMousePos.y - CELL_SIZE / 2, CELL_SIZE, DRAG_ITEM_ALPHA, DRAG_ITEM_SCALE);
            }
            if (this.hintToDisplay && animState.type === 'idle' && !this.isProcessingMove && !this.isShufflingBoard) {
                const pulseFactor = Math.abs(Math.sin(Date.now() / HINT_PULSE_SPEED));
                this.ctx.save();
                this.ctx.lineWidth = 3 + pulseFactor * 2; this.ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + pulseFactor * 0.5})`;
                if (Array.isArray(this.hintToDisplay)) this.hintToDisplay.forEach(p=>this.ctx.strokeRect(p.col*CELL_SIZE+this.ctx.lineWidth/2,p.row*CELL_SIZE+this.ctx.lineWidth/2,CELL_SIZE-this.ctx.lineWidth,CELL_SIZE-this.ctx.lineWidth));
                else { const p=this.hintToDisplay; this.ctx.strokeRect(p.col*CELL_SIZE+this.ctx.lineWidth/2,p.row*CELL_SIZE+this.ctx.lineWidth/2,CELL_SIZE-this.ctx.lineWidth,CELL_SIZE-this.ctx.lineWidth);}
                this.ctx.restore();
            }
            
            this.drawComboText();
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    }
    
    // 최종적으로 Game 클래스의 인스턴스를 생성하여 게임을 시작합니다.
    new Game();
});