
var gameItems = ['Rock', 'Paper', 'Scissors'];

var game = {
	//last snapshot values of what is stored in firebase
	players:{},
	winner: '',
	update:function(players) {
		this.players = players;
		this.setWinnerIfChoicePresent();
		this.render();
	},

	
	setWinnerIfChoicePresent:function() {
		//both player present
		if(this.hasPlayer1() && this.hasPlayer2()) {
			var player1Choice = this.players.player1.choice;
			var player2Choice = this.players.player2.choice;
			if(player1Choice && player2Choice) {//both choices present
				if((player1Choice == 'Rock' && player2Choice == 'Scissors') ||
					(player1Choice == 'Scissors' && player2Choice == 'Paper')) {
					this.winner = this.players.player1.name;
				} else if((player2Choice == 'Rock' && player1Choice == 'Scissors') ||
					(player2Choice == 'Scissors' && player1Choice == 'Paper')) {
					this.winner = this.players.player2.name;
				} else {
					this.winner = 'Tie'
				}
			}
		} else {
			this.winner = '';
		}

	},

	takeSeat:function(playerSeat,playerName) {
		//store locally in case user refreshes browser
		localStorage.setItem("rps.seat", playerSeat);
		localStorage.setItem("rps.name", playerName);

		this.seat = playerSeat;
		//write to database with new player
		firebase.database().ref(playerSeat).set({
				name:playerName,
				winCount:0,
				losesCount:0,
				choice:'',
				chat:'',
		});
		this.render();
	},

	startGame:function() {
		var playerName = $('#name').val();
		 $('#name').val('');
		//if name empty do nothing, return immeditely 
		if(playerName == '' || playerName.trim() == '') {
			return;
		}
		
		if(! this.hasPlayer1()){
			this.takeSeat('player1', playerName);
		} else if( ! this.hasPlayer2()){
			this.takeSeat('player2', playerName);
		}

	},
	isThisGamePlayer: function(player) {
		console.log(player.name + ' ' + localStorage.getItem("rps.name"))
		if(player.name == localStorage.getItem("rps.name")) {
			return true;
		}
		return false;

	},
	hasPlayer1:function() {
		if('player1' in this.players){
			return true;
		}
		return false;
	},
	hasPlayer2:function(){
		if('player2' in this.players){
			return true;
		}
		return false;
	},

	setChoice:function(choice) {
		var playerSeat = localStorage.getItem("rps.seat");
		firebase.database().ref(playerSeat).transaction(function(record) {
			record.choice = choice;
		});
	},


	renderPlayer:function(playerWindow, hasPlayer, player, playerSeat) {
		playerWindow.empty();
		if(! hasPlayer) {
			playerWindow.text("Waiting for " + playerSeat);
		} else {
			var nameDiv = $('<div>');
			nameDiv.text(player.name);
			playerWindow.append(nameDiv);
			if(player.choice) {
				var choice = $('<h1>');
				choice.text(player.choice);
				playerWindow.append(choice);
			} else {
				var options = $('<ul>');
				for(var i = 0; i<gameItems.length;i++){
					var listItem = $('<li>');
					listItem.text(gameItems[i]);
					listItem.attr('data-choice', gameItems[i]);
					listItem.addClass('slection');
					
					options.append(listItem);
					if(this.isThisGamePlayer(player)) {
						listItem.click(function() {
							var choice = $(this).attr('data-choice');
							console.log('seting choice ' + choice)
							game.setChoice(choice)
						})
					}
					
				}
				playerWindow.append(options);
			} 
			var score = $('<div>');
			score.text('Wins: ' + player.winCount + 
					' Losses: ' + player.losesCount);
			playerWindow.append(score);	
		}


	},

	render:function(){

		if(this.winner) {
			var winner = $('<h1>');
			winner.text(this.winner);
			$('#winnerWindow').append(winner);
		}
		var player1Window = $('#player1Window');
		this.renderPlayer(player1Window, this.hasPlayer1(), this.players.player1, 'player 1');

		var player2Window = $('#player2Window');
		this.renderPlayer(player2Window, this.hasPlayer2(), this.players.player2, 'player 2');
	}
}

$(document).ready(function() {
	

	firebase.database().ref().on('value',function(snapshot){
		var players = {};
		var value = snapshot.val();
		if(value == null) {
			game.update(players);
			return;
		}

		//read form local cache
		if('player1' in value)  {//test if value has 'player1' key
			players.player1 = {};
			for(var key in value.player1) {
				players.player1[key] = value.player1[key];
			}
		}
		if('player2' in value){
			players.player2 = {};
			for(var key in value.player2){
				players.player2[key] = value.player2[key];
			}
		}

		game.update(players);

	});


	var startButton = $('#startButton');
	startButton.click(function(){
		 	game.startGame();
	})

});