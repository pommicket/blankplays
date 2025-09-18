'use strict';

const N = 15; // board size

const NOTHING = "∅";
const EMAIL = 'pommicket' + '@pommicket.com';

let lexicon = new URL(location.href).searchParams.get('lexicon') || 'nwl23';

function updateBoardSize() {
	let boardElem = document.getElementById('board');
	// sucks for desktop zooming, but there's no way around it.
	let width = innerWidth;
	let height = innerHeight;
	let boardSize = Math.min(width - 20, Math.floor(height * 0.7));
	let fontSize = (boardSize / N - 4) * 0.6;
	boardElem.style.fontSize = fontSize + 'px';
	boardElem.style.width = boardSize + 'px';
	boardElem.style.height = boardSize + 'px';
	let selectContainer = document.getElementById('select-container');
	selectContainer.style.fontSize = fontSize + 'px';
	selectContainer.style.width = boardSize + 'px';
	selectContainer.style.height = boardSize / N * 2 + 'px';
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
let currSolution = [];
let board = [];
let trueSolution = [];
let skipWordsOfLength = 2;
let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let finished = false;

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

function addToSolution(row, col, letter) {
	let highlight = document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`);
	if (letter === NOTHING) {
		currSolution[row][col] = [];
		highlight.classList.add('nothing');
		updatePossibilities(highlight, []);
		deselectTile();
		return;
	}
	let letters = currSolution[row][col];
	if (letters.indexOf(letter) !== -1) return;
	letters.push(letter);
	letters.sort();
	highlight.classList.remove('nothing');
	updatePossibilities(highlight, letters);
}

function removeFromSolution(row, col, letter) {
	let highlight = document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`);
	if (letter === NOTHING) {
		highlight.classList.remove('nothing');
		return;
	}
	let letters = currSolution[row][col];
	let idx = letters.indexOf(letter);
	if (idx === -1) return;
	letters.splice(idx, 1);
	updatePossibilities(highlight, letters);
}

function toggleInSolution(row, col, letter) {
	let letters = currSolution[row][col];
	let idx = letters.indexOf(letter);
	if (idx === -1) {
		addToSolution(row, col, letter);
	} else {
		removeFromSolution(row, col, letter);
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
	document.getElementById('select-container').style.display = 'grid';
	let placing = document.querySelector('.tile.placing');
	if (placing)
		placing.classList.remove('placing');
	elem.classList.add('selected');
	if (finished) {
		let guess = currSolution[row][col];
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
		for (let letter of currSolution[row][col]) {
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
				toggleInSolution(row, col, placing.dataset.letter);
			} else if (highlight.classList.contains('selected')) {
				deselectTile();
			} else {
				selectTile(highlight, row, col);
			}
			e.preventDefault();
		} else if (e.button === 2) {
			if (highlight.classList.contains('nothing')) {
				highlight.classList.remove('nothing');
			} else if (currSolution[row][col].length === 0) {
				highlight.classList.add('nothing');
				if (highlight.classList.contains('selected'))
					deselectTile();
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
	// TODO : check format & report error if wrong
	let body = await result.text();
	let lines = body.split('\n');
	board = [];
	for (let row = 0; row < 15; row++) {
		board.push([]);
		for (let col = 0; col < 15; col++) {
			board[row].push(lines[row][col]);
		}
	}
	trueSolution = [];
	for (let row = 0; row < 15; row++) {
		trueSolution.push([]);
		for (let col = 0; col < 15; col++) {
			trueSolution[row].push([]);
		}
	}
	for (let i = 15; i < lines.length; i++) {
		if (!lines[i]) continue;
		let parts = lines[i].split(' ');
		let square = parseInt(parts[0], 10);
		let letter = parts[1];
		trueSolution[Math.floor(square / 15)][square % 15].push(letter);
	}
	for (let row = 0; row < 15; row++)
		for (let col = 0; col < 15; col++)
			trueSolution[row][col].sort();
}

function updateBoard() {
	for (let highlight of document.querySelectorAll('.highlight')) {
		highlight.remove();
	}
	for (let row = 0; row < 15; row++) {
		for (let col = 0; col < 15; col++) {
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
			updatePossibilities(highlight, currSolution[row][col]);
			boardSquareElems[row][col].appendChild(highlight);
			highlight.addEventListener('contextmenu', (e) => e.preventDefault());
			highlight.addEventListener('mousedown', clickedSquare(highlight, row, col));
		}
	}
	updateSkipWordsOfLength();
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
	skipWordsOfLength = skip3s.checked ? 3 : skip2s.checked ? 2 : 1;
	for (let row = 0; row < 15; row++) {
		for (let col = 0; col < 15; col++) {
			if (!includeSquare(row, col)) continue;
			let tooShort = skipDueToLength(row, col);
			document.querySelector(`.highlight[data-row="${row}"][data-col="${col}"]`).style.visibility =
				tooShort ? 'hidden' : 'visible';
		}
	}
}

function showSolution() {
	finished = true;
	deselectTile();
	document.getElementById('select-nothing').style.display = 'none';
	document.getElementById('select-heading').style.display = 'none';
	document.getElementById('place-heading').style.display = 'none';
	document.getElementById('select-container').style.display = 'none';
	let correctPlays = 0;
	let incorrectPlays = 0;
	let missedPlays = 0;
	for (let row = 0; row < 15; row++) {
		for (let col = 0; col < 15; col++) {
			if (!includeSquare(row, col))
				continue;
			let guess = currSolution[row][col];
			let solution = trueSolution[row][col];
			let highlightElem = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
			let possibilitiesElem = highlightElem.querySelector('.possibilities');
			possibilitiesElem.innerHTML = '';
			let totalLength = 0;
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
				} else if (inGuess && !inSolution) {
					span.classList.add('wrong');
					if (!skipDueToLength(row, col)) incorrectPlays += 1;
				} else {
					span.classList.add('correct');
					if (!skipDueToLength(row, col)) correctPlays += 1;
				}
				possibilitiesElem.appendChild(span);
			}
			if (solution.length === 0) {
				highlightElem.classList.add('nothing');
			} else {
				highlightElem.classList.remove('nothing');
			}
			let fontSize = getFontSizeForPossibilities(totalLength);
			possibilitiesElem.style.fontSize = fontSize;
		}
	}
	// show stats
	let score = Math.round((correctPlays - incorrectPlays) / (correctPlays + missedPlays) * 100);
	score = Math.max(score, 0);
	if (missedPlays || incorrectPlays) {
		// stop rounding to 100 when not perfect
		score = Math.min(score, 99);
	}
	let scoreMeter = document.getElementById('score-meter');
	scoreMeter.value = score;
	scoreMeter.style.setProperty('--color', `hsl(${Math.round(score*120/100)}deg 90% 50%)`);
	document.getElementById('score-span').innerText = score;
	document.getElementById('correct-plays').innerText = correctPlays;
	document.getElementById('incorrect-plays').innerText = incorrectPlays;
	document.getElementById('missed-plays').innerText = missedPlays;
	document.getElementById('stats').style.display = 'block';
	let shareText = `I got ${score}/100 on today's BlankPlays!`;
	if (score !== 100);
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

function startup() {
	let boardElem = document.getElementById('board');
	let skip2s = document.getElementById('skip-2s');
	let skip3s = document.getElementById('skip-3s');
	skip2s.addEventListener('change', () => {
		if (!skip2s.checked)
			skip3s.checked = false;
		updateSkipWordsOfLength();
	});
	skip3s.addEventListener('change', () => {
		if (skip3s.checked)
			skip2s.checked = true;
		updateSkipWordsOfLength();
	});
	document.getElementById('submit').addEventListener('click', showSolution);
	updateBoardSize();
	for (let row = 0; row < N; row++) {
		let rowElem = document.createElement('div');
		rowElem.classList.add('board-row');
		boardElem.appendChild(rowElem);
		boardSquareElems.push([]);
		currSolution.push([]);
		for (let col = 0; col < N; col++) {
			let squareElem = document.createElement('div');
			squareElem.classList.add('board-square');
			let bonus = getBonus(row, col);
			if (bonus) squareElem.classList.add(bonus);
			rowElem.appendChild(squareElem);
			boardSquareElems[row].push(squareElem);
			currSolution[row].push([]);
		}
	}
	let selectContainer = document.getElementById('select-container');
	let selections = alphabet.slice();
	selections.push(NOTHING);
	for (let tileRow = 0; tileRow * N < selections.length; tileRow++) {
		let rowContainer = document.createElement('div');
		rowContainer.classList.add('select-container-row');
		selectContainer.appendChild(rowContainer);
		for (let i = tileRow*N; i < (tileRow+1)*N; i++) {
			if (i >= selections.length) break;
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
				let tileSelected = document.querySelector('.highlight.selected');
				let className = !tileSelected ? 'placing' :
					letter === NOTHING ? '__unused' : 'possible';
				if (tileElem.classList.contains(className)) {
					tileElem.classList.remove(className);
					if (tileSelected) {
						let row = parseInt(tileSelected.dataset.row);
						let col = parseInt(tileSelected.dataset.col);
						removeFromSolution(row, col, letter);
					}
				} else {
					let placing = document.querySelector('.placing');
					if (placing) placing.classList.remove('placing');
					tileElem.classList.add(className);
					if (tileSelected) {
						let row = parseInt(tileSelected.dataset.row);
						let col = parseInt(tileSelected.dataset.col);
						addToSolution(row, col, letter);
					}
				}
			});
			rowContainer.appendChild(elem);
		}
	}
	loadChallenge('00000').then(() => updateBoard());
}

window.addEventListener('load', startup);
window.addEventListener('resize', updateBoardSize);
