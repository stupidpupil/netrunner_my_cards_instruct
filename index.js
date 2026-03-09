
async function fetchBinder() {

  const requestURL = "binder.json"
    //"https://script.googleusercontent.com/macros/echo?user_content_key=AY5xjrSv19c4oslohY0W1L9DxawzNLPZVAjDr8LuzsJpWXft-GBFnE6Tgjhqgxrz92puyoCpfqD4kOpz0ss3jntG0jtY1ZPMn4bq_EC10m1z_sBTtk6FGv16UUFzxeZKNKuJy-mukOFP2pJzc9_wPr05MBvToFBZJh5TDWbbTdH0HSen8wHBddVzRRoiOSVUSG2S0x569ZV_BE1i5QetGAvklCgXG3UNbV7wWXzw6bFyE1stelnXCZ4XAVclJ4mC_boILz2DxIP68z3rT4p89NS8mrOkMYJPY_HZ85G-QElC&lib=MaARNnBTJVwkY4ks6A52zkuVa7RvQokSP";
  const request = new Request(requestURL);

  const response = await fetch(request);
 
  return response.json();
}

const binderPromise = fetchBinder()


async function fetchDecklist(decklistUUID) {

  const requestURL = "https://netrunnerdb.com/api/2.0/public/decklist/" + decklistUUID

  const request = new Request(requestURL);

  const response = await fetch(request);
  return response.json();
}

const paramsString = window.location.search;
const searchParams = new URLSearchParams(paramsString);

let decklistPromise = fetchDecklist(searchParams.get("deck"))

let pagePairs

binderPromise.then(() => {
	$("#fetching-binder .status").text("✓")
}).catch(() => {
	$("#fetching-binder .status").text("✘")
})

decklistPromise.then((decklist) => {

	if(decklist.success){
		$("#fetching-decklist .status").text("✓")
	}else{
		$("#fetching-decklist .status").text("✘")
	}

}).catch(() => {
	$("#fetching-decklist .status").text("✘")
})

let cardsInDecklist = []

Promise.all([binderPromise, decklistPromise]).then(([binder, decklist]) => {

	if(!decklist.success){
		return
	}


	document.title = decklist.data[0].name + " | My Card Finder"

	let requiredCardsRemaining = decklist.data[0].cards
	let availableCardsRemaining = binder


	pagePairs = [
		[[],]
	]

	let problems = []

	while(Object.keys(requiredCardsRemaining).length > 0 && availableCardsRemaining.length > 0){

		let nextCard = availableCardsRemaining.shift()

		nextCard.need_how_many = 0

		if(requiredCardsRemaining[nextCard.code]){
			nextCard.need_how_many = requiredCardsRemaining[nextCard.code]


			if(nextCard.need_how_many > nextCard.got_how_many){
				problems.push(
					"Need " + nextCard.need_how_many + 
					" copies of " + nextCard.title + ", only got " + nextCard.got_how_many)
			}

			cardsInDecklist.push(nextCard)

			Reflect.deleteProperty(requiredCardsRemaining, nextCard.code)
		}


		let nextCardPagePairIdx = Math.floor(nextCard.page / 2)
		let nextCardPagePairPageIdx = nextCard.page % 2

		if(!pagePairs[nextCardPagePairIdx]){
			pagePairs[nextCardPagePairIdx] = []
		}

		if(!pagePairs[nextCardPagePairIdx][nextCardPagePairPageIdx]){
			pagePairs[nextCardPagePairIdx][nextCardPagePairPageIdx] = []
		}

		// card_on_page is numbered from 1, so minus-one for JS array
		pagePairs[nextCardPagePairIdx][nextCardPagePairPageIdx][nextCard.card_on_page - 1] = nextCard

	}


	Object.keys(requiredCardsRemaining).forEach((requiredCardCode) => {
		problems.push("Couldn't find any cards for code " + requiredCardCode)
	})

	console.log(problems)


	let identityCard = cardsInDecklist.filter((c) => {return c.type_code == "identity"})[0]

	if(identityCard){
		$("head").append("<link rel='icon' type='image/svg+xml' href='nsg_visual_assets/factions/NSG_" + identityCard.faction_code.toUpperCase() + ".svg'>")
	}

	// Now to actually build the page!

	let instructionHtml = ""
	const cardIndex = Array(12).fill(0).map((_, index)=> index);

	pagePairs.forEach((pagePair) => {


		const any_needed = pagePair.flat().filter((c) => c?.need_how_many)

		if(any_needed.length == 0){
			// TODO: Skip page pairs
		}

		instructionHtml += "<div class='page-pair'>";


		[0,1].forEach((pageIdx) => {
			instructionHtml += "<div class='page'>"

			cardIndex.forEach((cardIndex) => {

				let classes = ["card"]
				let card

				if(pagePair[pageIdx]?.[cardIndex]){
					card = pagePair[pageIdx]?.[cardIndex]
					classes.push("exists")

					if(card.need_how_many > 0){
						card.needed = true
						classes.push("needed")
					}
				}

				
				instructionHtml += "<div class='" + classes.join(" ") + " ' data-faction='" + card?.faction_code + "'>"

				if(card){

					let imageUrl = "https://card-images.netrunnerdb.com/v2/small/"+ card.code + ".jpg"

					if(card.needed){
						imageUrl = "https://card-images.netrunnerdb.com/v2/large/"+ card.code + ".jpg"
					}

					instructionHtml += "<img loading='lazy' src='" + imageUrl + "'>"
					instructionHtml += "<a href='https://netrunnerdb.com/en/card/" + card.code + "' target = '_blank'>"
					instructionHtml += "<div class='info'>"
					instructionHtml += "<div class='title'>" + card.title + "</div>"
					instructionHtml	+= "<div class='how_many'>" + card.need_how_many + "</div>"
					instructionHtml += "</div>"
					instructionHtml += "</a>"
				}else{
					instructionHtml += "<img src='blank.png' >"					
				}

				instructionHtml += "</div>"
			})

			instructionHtml += "</div>"
		})

		instructionHtml += "</div>"
	})

	$("#progress-info").remove()
	$("body").append(instructionHtml)
	$(".card.needed").first().parent()[0].scrollIntoView()
})