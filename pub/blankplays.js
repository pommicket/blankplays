'use strict';

const N = 15; // board size

const NOTHING = "∅";
const EMAIL = 'pommicket' + '@pommicket.com';

let lexicon = new URL(location.href).searchParams.get('lexicon')
	|| localStorage.getItem('prevLexicon') || 'nwl23';
localStorage.setItem('prevLexicon', lexicon);

function updateBoardSize() {
	let boardElem = document.getElementById('board');
	// sucks for desktop zooming, but there's no way around it.
	let width = document.body.clientWidth; // use clientWidth to not include body margins
	let height = innerHeight;
	let boardSize = Math.min(width, Math.floor(height * 0.7));
	let tileSize = boardSize / N;
	//  use large font size if it's <=1cm,
	//  small font size if it's >1cm
	//  use 1cm font size otherwise.
	let fontSize = `max(${tileSize * 0.6}px,min(${tileSize * 0.7}px,1cm))`;
	boardElem.style.fontSize = fontSize;
	boardElem.style.width = boardSize + 'px';
	boardElem.style.height = boardSize + 'px';
	let selectContainer = document.getElementById('select-container');
	selectContainer.style.fontSize = fontSize;
	selectContainer.style.maxWidth = boardSize + 'px';
}

const DOUBLE_LETTER = 'double-letter';
const TRIPLE_LETTER = 'triple-letter';
const DOUBLE_WORD = 'double-word';
const TRIPLE_WORD = 'triple-word';

function getBonus(row, col) {
	row = Math.min(row, N-1 - row);
	col = Math.min(col, N-1 - col);
	let id = Math.min(row * N + col, col * N + row);
	if (id === 0 || id === 7) {
		return TRIPLE_WORD;
	} else if (id === N+5 || id === 5*N+5) {
		return TRIPLE_LETTER;
	} else if (id === 3 || id === 2*N+6 || id === 3*N+7 || id === 6*N+6) {
		return DOUBLE_LETTER;
	} else if (id === 7*N+7 || id === N+1 || id === 2*N+2 || id === 3*N+3 || id === 4*N+4) {
		return DOUBLE_WORD;
	} else {
		return '';
	}
}

function pointValue(letter) {
	return {
		'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1,
		'F': 4, 'G': 2, 'H': 4, 'I': 1, 'J': 8,
		'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1,
		'P': 3, 'Q': 10,'R': 1, 'S': 1, 'T': 1,
		'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4,
		'Z': 10,
	}[letter];
}

let boardSquareElems = [];
let currAttempt = [];
let board = [];
let trueSolution = [];
let skipWordsOfLength = parseInt(localStorage.getItem(`skip-${lexicon}`)) || 2;
let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let finished = false;
let challengeId;

function loadAttempt() {
	let saveDataStr = localStorage.getItem(`attempt-${lexicon}`);
	if (!saveDataStr) return null;
	let saveData = JSON.parse(saveDataStr);
	if (saveData.id !== challengeId) {
		// old data
		return;
	}
	for (let row = 0; row < N; row++) {
		for (let col = 0; col < N; col++) {
			for (let letter of saveData.solution[row][col]) {
				addToGuesses(row, col, letter);
			}
			if (saveData.eliminated && saveData.eliminated[row*N+col]) {
				document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`)
					.classList.add('nothing');
			}
		}
	}
	if (saveData.finished)
		showSolution();
}

function saveAttempt() {
	let eliminated = new Array(N*N).fill(false);
	for (let highlightElem of document.querySelectorAll('.highlight.nothing')) {
		let row = parseInt(highlightElem.dataset.row);
		let col = parseInt(highlightElem.dataset.col);
		eliminated[row*N+col] = true;
	}
	let saveData = {
		version: 1,
		id: challengeId,
		solution: currAttempt,
		finished: finished,
		eliminated: eliminated,
	};
	localStorage.setItem(`attempt-${lexicon}`, JSON.stringify(saveData));
}

function getFontSizeForPossibilities(n) {
	return (n === 1 ? 100
		: n === 2 ? 70
		: n < 5 ? 60
		: n < 7 ? 48
		: n < 12 ? 40
		: n < 20 ? 32
		: 26) + '%';
}

function updatePossibilities(highlightElem, letters) {
	let possibilitiesElem = highlightElem.querySelector('.possibilities');
	possibilitiesElem.innerText = letters.join('');
	let n = letters.length;
	let fontSize = getFontSizeForPossibilities(n);
	possibilitiesElem.style.fontSize = fontSize;
}

function addToGuesses(row, col, letter) {
	let highlight = document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`);
	if (letter === NOTHING) {
		currAttempt[row][col] = [];
		highlight.classList.add('nothing');
		updatePossibilities(highlight, []);
		deselectTile();
		saveAttempt();
		return;
	}
	let letters = currAttempt[row][col];
	if (letters.indexOf(letter) !== -1) return;
	letters.push(letter);
	letters.sort();
	highlight.classList.remove('nothing');
	updatePossibilities(highlight, letters);
	saveAttempt();
}

function removeFromGuesses(row, col, letter) {
	let highlight = document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`);
	if (letter === NOTHING) {
		highlight.classList.remove('nothing');
		saveAttempt();
		return;
	}
	let letters = currAttempt[row][col];
	let idx = letters.indexOf(letter);
	if (idx === -1) return;
	letters.splice(idx, 1);
	updatePossibilities(highlight, letters);
	saveAttempt();
}

function toggleInGuesses(row, col, letter) {
	let currentlyContains;
	if (letter === NOTHING) {
		let highlight = document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`);
		currentlyContains = highlight.classList.contains('nothing');
	} else {
		let letters = currAttempt[row][col].slice();
		let idx = letters.indexOf(letter);
		currentlyContains = idx !== -1;
	}
	if (currentlyContains) {
		removeFromGuesses(row, col, letter);
	} else {
		addToGuesses(row, col, letter);
	}
}

function makeTile(container, letter, showPointValue) {
	let tile = document.createElement('span');
	tile.classList.add('tile');
	let blank = false;
	if (letter === letter.toLowerCase()) {
		blank = true;
	}
	let text = document.createElement('span');
	text.appendChild(document.createTextNode(letter.toUpperCase()));
	let points = document.createElement('span');
	if (showPointValue)
		points.appendChild(document.createTextNode(blank ? '0' : pointValue(letter) + ''));
	points.classList.add('point-value');
	if (blank)
		text.classList.add('blank');
	tile.appendChild(text);
	container.appendChild(tile);
	container.appendChild(points);
}

function putTile(row, col, letter) {
	let squareElem = boardSquareElems[row][col];
	makeTile(squareElem, letter, true);
}

function selectTile(elem, row, col) {
	deselectTile();
	document.getElementById('select-container').style.display = 'block';
	let placing = document.querySelector('.tile.placing');
	if (placing)
		placing.classList.remove('placing');
	elem.classList.add('selected');
	if (finished) {
		let guess = currAttempt[row][col];
		let solution = trueSolution[row][col];
		for (let letter of alphabet) {
			let inGuess = guess.indexOf(letter) !== -1;
			let inSolution = solution.indexOf(letter) !== -1;
			let className;
			if (inGuess && inSolution) {
				className = 'correct';
			} else if (inGuess && !inSolution) {
				className = 'wrong';
			} else if (!inGuess && inSolution) {
				className = 'missed';
			} else {
				className = 'not-possible';
			}
			document.querySelector(`.tile[data-letter="${letter}"]`)
				.classList.add(className);
		}
	} else {
		document.getElementById('select-heading').style.display = 'block';
		document.getElementById('place-heading').style.display = 'none';
		for (let letter of currAttempt[row][col]) {
			document.querySelector(`.tile[data-letter="${letter}"]`)
				.classList.add('possible');
		}
	}
}

function deselectTile() {
	if (finished) {
		// don't show tiles at the bottom if nothing is selected
		document.getElementById('select-container').style.display = 'none';
	}
	let selected = document.querySelector('.highlight.selected');
	if (selected)
		selected.classList.remove('selected');
	for (let tile of document.querySelectorAll('.tile.possible'))
		tile.classList.remove('possible');
	for (let tile of document.querySelectorAll('.tile.missed'))
		tile.classList.remove('missed');
	for (let tile of document.querySelectorAll('.tile.correct'))
		tile.classList.remove('correct');
	for (let tile of document.querySelectorAll('.tile.wrong'))
		tile.classList.remove('wrong');
	for (let tile of document.querySelectorAll('.tile.not-possible'))
		tile.classList.remove('not-possible');
	if (!finished) {
		document.getElementById('select-heading').style.display = 'none';
		document.getElementById('place-heading').style.display = 'block';
	}
}

function clickedSquare(highlight, row, col) {
	return (e) => {
		if (e.button === 0) {
			let placing = document.querySelector('.placing');
			if (placing) {
				toggleInGuesses(row, col, placing.dataset.letter);
			} else if (highlight.classList.contains('selected')) {
				deselectTile();
			} else {
				selectTile(highlight, row, col);
			}
			e.preventDefault();
		} else if (e.button === 2) {
			if (highlight.classList.contains('nothing')) {
				highlight.classList.remove('nothing');
			} else if (currAttempt[row][col].length === 0) {
				highlight.classList.add('nothing');
				if (highlight.classList.contains('selected'))
					deselectTile();
				saveAttempt();
			}
			e.preventDefault();
		}
	};
}

function includeSquare(row, col) {
	if (board[row][col] !== '.') return false;
	let neighbours = [];
	if (row > 0)
		neighbours.push(board[row-1][col]);
	if (row < N-1)
		neighbours.push(board[row+1][col]);
	if (col > 0)
		neighbours.push(board[row][col-1]);
	if (col < N-1)
		neighbours.push(board[row][col+1]);
	if (neighbours.filter((x) => x !== '.').length === 0) {
		// not connected
		return false;
	}
	return true;
}

async function loadChallenge(id) {
	challengeId = id;
	let result = await fetch(`challenges-${lexicon}/${id}.txt`);
	if (result.status === 404) {
		alert(`Challenge for today hasn't been uploaded.
Please e-mail ${EMAIL}`);
		return;
	} else if (Math.floor(result.status / 100) !== 2) {
		alert(`Error getting today's challenge.
Try refreshing the page, or clearing your browser's cache for this site.
If problem persists, e-mail ${EMAIL}.`);
	}
	let body = await result.text();
	let lines = body.split('\n');
	board = [];
	for (let row = 0; row < N; row++) {
		board.push([]);
		for (let col = 0; col < N; col++) {
			board[row].push(lines[row][col]);
		}
	}
	trueSolution = [];
	for (let row = 0; row < N; row++) {
		trueSolution.push([]);
		for (let col = 0; col < N; col++) {
			trueSolution[row].push([]);
		}
	}
	for (let i = N; i < lines.length; i++) {
		if (!lines[i]) continue;
		let parts = lines[i].split(' ');
		let square = parseInt(parts[0], 10);
		let letter = parts[1];
		trueSolution[Math.floor(square / N)][square % N].push(letter);
	}
	for (let row = 0; row < N; row++)
		for (let col = 0; col < N; col++)
			trueSolution[row][col].sort();
	updateBoard();
	loadAttempt();
	let skip2s = document.getElementById('skip-2s');
	let skip3s = document.getElementById('skip-3s');
	let skip4s = document.getElementById('skip-4s');
	skip2s.checked = skipWordsOfLength >= 2;
	skip3s.checked = skipWordsOfLength >= 3;
	skip4s.checked = skipWordsOfLength >= 4;
	skip2s.addEventListener('change', () => {
		if (!skip2s.checked) {
			skip3s.checked = false;
			skip4s.checked = false;
		}
		updateSkipWordsOfLength();
	});
	skip3s.addEventListener('change', () => {
		if (skip3s.checked)
			skip2s.checked = true;
		if (!skip3s.checked)
			skip4s.checked = false;
		updateSkipWordsOfLength();
	});
	skip4s.addEventListener('change', () => {
		if (skip4s.checked) {
			skip2s.checked = true;
			skip3s.checked = true;
		}
		updateSkipWordsOfLength();
	});
	updateSkipWordsOfLength();
	document.getElementById('submit')
		.addEventListener('click', showSolution);
	window.addEventListener('keydown', (e) => {
		if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
			return;
		let letter = e.key.toUpperCase();
		let placing = document.querySelector('.placing');
		let squareSelected = document.querySelector('.highlight.selected');
		if (letter === 'ESCAPE') {
			if (placing) placing.classList.remove('placing');
			if (squareSelected) squareSelected.classList.remove('selected');
			return;
		} else if (letter === 'DELETE' || letter === 'TAB') {
			letter = NOTHING;
		} else if (alphabet.indexOf(letter) === -1) {
			return;
		}
		if (finished) return;
		let tile = document.querySelector(`.select-tile-container .tile[data-letter="${letter}"]`);
		if (squareSelected) {
			let row = parseInt(squareSelected.dataset.row);
			let col = parseInt(squareSelected.dataset.col);
			toggleInGuesses(row, col, letter);
			if (letter !== NOTHING)
				tile.classList.toggle('possible');
		} else {
			if (placing && placing !== tile) placing.classList.remove('placing');
			tile.classList.toggle('placing');
		}
		e.preventDefault();
	});
}

function updateBoard() {
	for (let highlight of document.querySelectorAll('.highlight')) {
		highlight.remove();
	}
	for (let row = 0; row < N; row++) {
		for (let col = 0; col < N; col++) {
			let letter = board[row][col];
			if (letter !== '.') {
				putTile(row, col, letter);
				continue;
			}
			if (!includeSquare(row, col))
				continue;
			let highlight = document.createElement('div');
			highlight.classList.add('highlight');
			highlight.dataset.row = row;
			highlight.dataset.col = col;
			let possibilities = document.createElement('span');
			possibilities.classList.add('possibilities');
			highlight.appendChild(possibilities);
			updatePossibilities(highlight, currAttempt[row][col]);
			boardSquareElems[row][col].appendChild(highlight);
			highlight.addEventListener('contextmenu', (e) => e.preventDefault());
			highlight.addEventListener('mousedown', clickedSquare(highlight, row, col));
		}
	}
}

function skipDueToLength(row, col) {
	let i = row;
	while (i > 0 && board[i-1][col] !== '.')
		i -= 1;
	let verticalWordLen = 1;
	while (i < N-1 && (i+1 === row || board[i+1][col] !== '.')) {
		verticalWordLen += 1;
		i += 1;
	}
	i = col;
	let horizontalWordLen = 1;
	while (i > 0 && board[row][i-1] !== '.')
		i -= 1;
	while (i < N-1 && (i+1 === col || board[row][i+1] !== '.')) {
		horizontalWordLen += 1;
		i += 1;
	}
	return Math.max(horizontalWordLen, verticalWordLen) <= skipWordsOfLength;
}

function updateSkipWordsOfLength() {
	let skip2s = document.getElementById('skip-2s');
	let skip3s = document.getElementById('skip-3s');
	let skip4s = document.getElementById('skip-4s');
	skipWordsOfLength = skip4s.checked ? 4 : skip3s.checked ? 3 : skip2s.checked ? 2 : 1;
	if (!finished)
		localStorage.setItem(`skip-${lexicon}`, skipWordsOfLength);
	for (let row = 0; row < N; row++) {
		for (let col = 0; col < N; col++) {
			if (!includeSquare(row, col)) continue;
			let tooShort = skipDueToLength(row, col);
			let highlightElem = document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`);
			highlightElem.style.visibility =
				tooShort ? 'hidden' : 'visible';
		}
	}
}

function showSolution() {
	finished = true;
	saveAttempt();
	deselectTile();
	document.getElementById('submit').style.display = 'none';
	document.getElementById('select-nothing').style.display = 'none';
	document.getElementById('select-heading').style.display = 'none';
	document.getElementById('place-heading').style.display = 'none';
	document.getElementById('select-container').style.display = 'none';
	let correctPlays = 0;
	let incorrectPlays = 0;
	let missedPlays = 0;
	for (let row = 0; row < N; row++) {
		for (let col = 0; col < N; col++) {
			if (!includeSquare(row, col))
				continue;
			let guess = currAttempt[row][col];
			let solution = trueSolution[row][col];
			let highlightElem = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
			let possibilitiesElem = highlightElem.querySelector('.possibilities');
			possibilitiesElem.innerHTML = '';
			let totalLength = 0;
			let allCorrect = true;
			for (let letter of alphabet) {
				let inGuess = guess.indexOf(letter) !== -1;
				let inSolution = solution.indexOf(letter) !== -1;
				if (!inGuess && !inSolution) continue;
				let span = document.createElement('span');
				span.innerText = letter;
				totalLength += letter.length;
				span.classList.add('solution-letter');
				if (!inGuess && inSolution) {
					span.classList.add('missed');
					if (!skipDueToLength(row, col)) missedPlays += 1;
					allCorrect = false;
				} else if (inGuess && !inSolution) {
					span.classList.add('wrong');
					if (!skipDueToLength(row, col)) incorrectPlays += 1;
					allCorrect = false;
				} else {
					span.classList.add('correct');
					if (!skipDueToLength(row, col)) correctPlays += 1;
				}
				possibilitiesElem.appendChild(span);
			}
			highlightElem.classList.remove('nothing');
			if (allCorrect)
				highlightElem.classList.add('all-correct');
			else if (solution.length === 0)
				highlightElem.classList.add('nothing');
			else
				highlightElem.classList.add('some-mistakes');

			if (totalLength) {
				let fontSize = getFontSizeForPossibilities(totalLength);
				possibilitiesElem.style.fontSize = fontSize;
			} else {
				highlightElem.style.display = 'none';
			}
		}
	}
	// show stats
	let score = Math.round((correctPlays - incorrectPlays) / (correctPlays + missedPlays) * 100);
	score = Math.max(score, 0);
	if (missedPlays || incorrectPlays) {
		// stop rounding to 100 when not perfect
		score = Math.min(score, 99);
	}
	let statsElem = document.getElementById('stats');
	statsElem.style.setProperty('--score-color', `hsl(${Math.round(score*120/100)}deg 90% 30%)`);
	let scoreMeter = document.getElementById('score-meter');
	scoreMeter.value = score;
	document.getElementById('score-span').innerText = score;
	document.getElementById('correct-plays').innerText = correctPlays;
	document.getElementById('incorrect-plays').innerText = incorrectPlays;
	document.getElementById('missed-plays').innerText = missedPlays;
	statsElem.style.display = 'block';
	let shareText = `I scored ${score}/100 on today's BlankPlays!`;
	if (score === 100)
		shareText += ' 😎';
	else
		shareText += '\nCan you do better?';
	shareText += `\nhttps://blankplays.pommicket.com?lexicon=${lexicon}`;
	let shareElem = document.getElementById('share');
	shareElem.value = shareText;
	let shareCopyButton = document.getElementById('share-copy');
	shareCopyButton.addEventListener('click', async function() {
		const COPIED = 'Copied to clipboard!';
		if ('clipboard' in navigator) {
			await navigator.clipboard.writeText(shareText);
		} else {
			shareElem.focus();
			shareElem.select();
			document.execCommand('copy');
		}
		shareCopyButton.innerText = COPIED;
	});
}

function showDialogById(id) {
	let elem = document.getElementById(id);
	if (elem.showModal) {
		elem.showModal();
	} else {
		// support for browsers without <dialog>
		//  (older iOS safari mainly)
		elem.style.display = 'block';
		// not sure why this needs to be in a timeout.
		// i guess we need to wait for re-flow or whatever.
		setTimeout(() => {
			elem.scrollIntoView(true);
		}, 10);
	}
}

async function startup() {
	document.getElementById('how-to-play-button').addEventListener('click', () => {
		showDialogById('how-to-play');
	});
	document.getElementById('credits-button').addEventListener('click', () => {
		showDialogById('credits');
	});
	document.getElementById('report-issue-button').addEventListener('click', () => {
		showDialogById('report-issue');
	});
	let darkModeButton = document.getElementById('dark-mode');
	let lightModeButton = document.getElementById('light-mode');
	if (window.darkMode) // set in inline script
		darkModeButton.checked = true;
	else
		lightModeButton.checked = true;
	darkModeButton.addEventListener('change', () => {
		if (darkModeButton.checked) {
			document.body.classList.add('dark-mode');
			localStorage.setItem('color-mode', 'dark');
		}
	});
	lightModeButton.addEventListener('change', () => {
		if (lightModeButton.checked) {
			document.body.classList.remove('dark-mode');
			localStorage.setItem('color-mode', 'light');
		}
	});
	let lexiconSelect = document.getElementById('lexicon');
	lexiconSelect.value = lexicon;
	lexiconSelect.addEventListener('change', () => {
		location.search = `?lexicon=${lexiconSelect.value}`;
	});
	let boardElem = document.getElementById('board');
	updateBoardSize();
	for (let row = 0; row < N; row++) {
		let rowElem = document.createElement('div');
		rowElem.classList.add('board-row');
		boardElem.appendChild(rowElem);
		boardSquareElems.push([]);
		currAttempt.push([]);
		for (let col = 0; col < N; col++) {
			let squareElem = document.createElement('div');
			squareElem.classList.add('board-square');
			let bonus = getBonus(row, col);
			if (bonus) squareElem.classList.add(bonus);
			rowElem.appendChild(squareElem);
			boardSquareElems[row].push(squareElem);
			currAttempt[row].push([]);
		}
	}
	let selectContainer = document.getElementById('select-container');
	let selections = alphabet.slice();
	selections.push(NOTHING);
	for (let i = 0; i < selections.length; i++) {
		let letter = selections[i];
		let elem = document.createElement('span');
		elem.classList.add('select-tile-container');
		if (letter === NOTHING) {
			elem.id = 'select-nothing';
		}
		makeTile(elem, letter, false);
		let tileElem = elem.querySelector('.tile');
		tileElem.dataset.letter = letter;
		elem.addEventListener('click', () => {
			if (finished) return;
			let squareSelected = document.querySelector('.highlight.selected');
			let className = !squareSelected ? 'placing' :
				letter === NOTHING ? '__unused' : 'possible';
			let placing = document.querySelector('.placing');
			if (placing && placing !== tileElem)
				placing.classList.remove('placing');
			tileElem.classList.toggle(className);
			if (squareSelected) {
				// toggle letter as possibility for square
				let row = parseInt(squareSelected.dataset.row);
				let col = parseInt(squareSelected.dataset.col);
				if (letter === NOTHING || tileElem.classList.contains('possible'))
					addToGuesses(row, col, letter);
				else
					removeFromGuesses(row, col, letter);
			}
		});
		selectContainer.appendChild(elem);
	}
	let dayNumber = Math.floor((new Date() - new Date(2025, 9-1, 19)) / (1000 * 60 * 60 * 24));
	document.getElementById('challenge-num').innerText = dayNumber;
	let challenge = dayNumber + '';
	while (challenge.length < 5)
		challenge = '0' + challenge;
	loadChallenge(challenge);
}

window.addEventListener('load', startup);
window.addEventListener('resize', updateBoardSize);
