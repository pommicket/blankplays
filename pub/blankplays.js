'use strict';

const N = 15; // board size

let lexicon = 'nwl23';

function updateBoardSize() {
	let board = document.getElementById('board');
	// sucks for desktop zooming, but there's no way around it.
	let width = innerWidth;
	let height = innerHeight;
	let boardSize = Math.min(width - 20, Math.floor(height * 0.6));
	let fontSize = (boardSize / N - 4) * 0.6;
	board.style.fontSize = fontSize + 'px';
	board.style.width = boardSize + 'px';
	board.style.height = boardSize + 'px';
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
	if (id == 0 || id == 7) {
		return TRIPLE_WORD;
	} else if (id == N+5 || id == 5*N+5) {
		return TRIPLE_LETTER;
	} else if (id == 3 || id == 2*N+6 || id == 3*N+7 || id == 6*N+6) {
		return DOUBLE_LETTER;
	} else if (id == 7*N+7 || id == N+1 || id == 2*N+2 || id == 3*N+3 || id == 4*N+4) {
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
	elem.classList.add('selected');
	document.getElementById('select').style.display = 'block';
}

function deselectTile() {
	let selected = document.querySelector('.selected');
	if (selected)
		selected.classList.remove('selected');
	for (let tile of document.querySelectorAll('.tile.possible')) {
		tile.classList.remove('possible');
	}
	document.getElementById('select').style.display = 'none';
}

function clickedSquare(highlight, row, col) {
	return (e) => {
		if (e.button === 0) {
			if (highlight.classList.contains('selected')) {
				deselectTile();
			} else {
				selectTile(highlight, row, col);
			}
			e.preventDefault();
		} else if (e.button === 2) {
			if (highlight.classList.contains('nothing')) {
				highlight.classList.remove('nothing');
			} else {
				highlight.classList.add('nothing');
				if (highlight.classList.contains('selected'))
					deselectTile();
			}
			e.preventDefault();
		}
	};
}

// TODO : error handling
async function loadChallenge(id) {
	let result = await fetch(`challenges-${lexicon}/${id}.txt`);
	let body = await result.text();
	let lines = body.split('\n');
	let board = [];
	for (let row = 0; row < 15; row++) {
		board.push([]);
		for (let col = 0; col < 15; col++) {
			board[row].push(lines[row][col]);
		}
	}
	for (let row = 0; row < 15; row++) {
		for (let col = 0; col < 15; col++) {
			let letter = board[row][col];
			if (letter !== '.') {
				putTile(row, col, letter);
				continue;
			}
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
				continue;
			}
			let highlight = document.createElement('div');
			highlight.classList.add('highlight');
			boardSquareElems[row][col].appendChild(highlight);
			highlight.addEventListener('contextmenu', (e) => e.preventDefault());
			highlight.addEventListener('mousedown', clickedSquare(highlight, row, col));
		}
	}
}

function startup() {
	updateBoardSize();
	for (let row = 0; row < N; row++) {
		let rowElem = document.createElement('div');
		rowElem.classList.add('board-row');
		board.appendChild(rowElem);
		boardSquareElems.push([]);
		for (let col = 0; col < N; col++) {
			let squareElem = document.createElement('div');
			squareElem.classList.add('board-square');
			let bonus = getBonus(row, col);
			if (bonus) squareElem.classList.add(bonus);
			rowElem.appendChild(squareElem);
			boardSquareElems[row].push(squareElem);
		}
	}
	let selectContainer = document.getElementById('select-container');
	for (let row = 0; row < 2; row++) {
		let rowContainer = selectContainer.querySelectorAll('.select-container-row')[row];
		for (let i = row*N; i < (row+1)*N; i++) {
			let tiles = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			if (i >= tiles.length) break;
			let elem = document.createElement('span');
			elem.classList.add('select-tile-container');
			makeTile(elem, tiles[i], false);
			let tileElem = elem.querySelector('.tile');
			elem.addEventListener('click', () => {
				if (tileElem.classList.contains('possible'))
					tileElem.classList.remove('possible');
				else
					tileElem.classList.add('possible');
			});
			rowContainer.appendChild(elem);
		}
	}
	loadChallenge('00000');
}

window.addEventListener('load', startup);
window.addEventListener('resize', updateBoardSize);
