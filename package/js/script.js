import countries from "./countries.js"


//Wikidata et DBPedia endpoints
const endpointUrl = 'https://query.wikidata.org/sparql';
const endpointUrlDbPedia = 'http://dbpedia.org/sparql';

function makeSPARQLQuery( endpointUrl, sparqlQuery, doneCallback ) {
    const settings = {
        headers: { Accept: 'application/sparql-results+json' },
        data: { query: sparqlQuery }
    };
    return $.ajax( endpointUrl, settings ).then( doneCallback );
}


//init
let eventsPeriod = [];
let eventsPeriod1 = [];
let eventsPeriod2 = [];
let eventsPeriod3 = [];
let eventsPeriod4 = [];
let period = 1;
let index = 3;
let leftArrow = $('[data-direction="prev"]');
let rightArrow = $('[data-direction="next"]');


$(document).ready(function(){

    function getCountryValue(country) {
        return countries[country] || "Pays non trouvé";
    }
    let nbResults = 0;
   
    $("#map-europe").CSSMap({
    "size": 750,
    "mapStyle": "vintage",
    "tooltips": "floating-top-center",
    "responsive": "auto",
    "onClick" : async function(e) {
        const rText = e.children("A").eq(0).text()   
        const codeCountry = getCountryValue(rText)
        loadCountry(codeCountry, rText, endpointUrl)
      }
    });

    async function loadEvent(event, cardIndex) {
      const query = `SELECT DISTINCT ?event ?eventLabel ?image ?datedeb ?datefin ?locationLabel
      WHERE {
        BIND(wd:${event} AS ?event)
        
        OPTIONAL { ?event wdt:P580 ?start. }
        OPTIONAL { ?event wdt:P585 ?timepoint. }
        BIND (COALESCE(?start, ?timepoint) AS ?datedeb)
        
        OPTIONAL{?event wdt:P18 ?image.}
        OPTIONAL{?event wdt:P582 ?datefin.}
        OPTIONAL{?event wdt:P276 ?location}
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
      }`;
      const data = await makeSPARQLQuery( endpointUrl, query)
      const result = data.results.bindings[0];
      const dateDebut = getDate(result.datedeb.value);
      let dateFin = ""
      let location = ""
      if (result.datefin) {
        dateFin = getDate(result.datefin.value)
      }
      if (result.locationLabel) {
        location = result.locationLabel.value
      }

      const image = result.image ? result.image.value : '../img/'+period+'.png';
      createCard(result.event.value, result.eventLabel.value, image, dateDebut, dateFin, location, cardIndex)
    }

    function openCountryHistory(countryName){
      $("#informationsPeriode").hide()
      $('#country').html(countryName)
      $('#frise-country').addClass('animationOpenFrise')
    }
    
    function createCard(lien, nom, image, dateDeb, dateFin, location, cardId) {
      const cardDiv = $('.card[data-index='+ cardId +']');
      cardDiv.attr('id', lien);
      cardDiv.attr('data-lien', lien);
      $(cardDiv).find('img').attr('src', image)
      $(cardDiv).find('.titre').html(nom);
      $(cardDiv).find('.date').html(dateDeb);
      if(dateFin) {
        $(cardDiv).find('.datefin').html(" - " + dateFin);
      }
      if(location) {
        $(cardDiv).find('.location').html("Lieu: " + location);
      }
    }
    
    function loadNewEvents(eventsPeriod, index) {
      let cardIndex = 1;
      if(eventsPeriod.length > 0) {
        for(let i=index-3; i < index; i++) {
          if(eventsPeriod[i]) {
            const parsedId = eventsPeriod[i].event.value.split('/');
            const idEvent = parsedId[parsedId.length - 1];
            loadEvent(idEvent, cardIndex);
            const cardDiv = $('.card[data-index='+ cardIndex +']');
            cardDiv.removeClass('invisible');
            cardIndex += 1;
          }
        }
      } else {
        rightArrow.addClass('invisible')
      }
    }

    async function loadCountry(country, rText, endpoint) {
      const sparqlQuery = `SELECT * {
        {SELECT ?event ?eventLabel ?date {
          ?event wdt:P17 wd:${country}.
          ?event wdt:P31/wdt:P279* wd:Q13418847.
                 
          OPTIONAL {?event wdt:P580 ?start.}
          OPTIONAL {?event wdt:P585 ?timepoint.}
          BIND (COALESCE(?start, ?timepoint) AS ?date)
          
          FILTER (BOUND(?date) && regex(str(?date), "^[^-].*", "i"))
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
        } ORDER BY(?date)}
      FILTER lang(?eventLabel)
      }
      `; 
       const data = await makeSPARQLQuery(endpoint, sparqlQuery)
        nbResults = data.results.bindings.length;
        for(let i=0; i < data.results.bindings.length; i++) {
          const result = data.results.bindings[i];
          const date = new Date(result.date.value);
          const year = date.getUTCFullYear();
          if (year < 476) {
            eventsPeriod1.push(result);
          } else if (year >= 476 && year < 1493) {
            eventsPeriod2.push(result);
          } else if (year >= 1493 && year < 1790) {
            eventsPeriod3.push(result);
          } else if (year >= 1790) {
            eventsPeriod4.push(result);
          }
        }
    
    $("#containerTimeline").show()
    $("#epoqueTitre").show()
    openCountryHistory(rText, nbResults)
    setIndex(3);
    leftArrow.addClass("invisible");
    }

    function getRandomCountry(countries) {
      const keys = Object.keys(countries);
      const randomIndex = Math.floor(Math.random() * keys.length);
      const randomKey = keys[randomIndex];
      return {
          country: randomKey,
          code: countries[randomKey]
      };
    }

    function getDate(date) {
      date = new Date(date)
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return day + '/' + month + '/' + year;
    }

    function emptyPeriods() {
      eventsPeriod1 = [];
      eventsPeriod2 = [];
      eventsPeriod3 = [];
      eventsPeriod4 = [];
    }
    
    function setIndex(i) {
      index = i
    }

    function hideCards() {
      $(".card").addClass('invisible')
    }

    // Partie gestion évènement

    $("#buttonDecouvrir").on('click', function() {
      const country = getRandomCountry(countries);
      loadCountry(country["code"], country["country"], endpointUrl)
    })

    $("#retour").on('click', function() {
      hideCards()
      const country = $("#country").value
      loadCountry(countries[country], country, endpointUrl)
    })

    $('.arrow').on('click', function(){
      hideCards()
      const direction = $(this).data('direction');
      if(direction == "next") {
        if(index == 3) {
          setIndex(6)
          leftArrow.removeClass("invisible")
        } else {
          setIndex(index + 3)
        }
        const lastSpin = (index >= eventsPeriod.length);
        if(lastSpin) {
          rightArrow.addClass("invisible")
        }
      } else if(direction == "prev") {
        setIndex(index - 3)
        rightArrow.removeClass("invisible")
        if(index == 3) {
          leftArrow.addClass("invisible");
        }
      }
      loadNewEvents(eventsPeriod, index)
    })

    $('#close-button').click(function() {
      $(".active-region").removeClass("active-region");
      hideCards();
      $('#frise-country').removeClass('animationOpenFrise');
      $("#containerTimeline").show()
      $("#informationsPeriode").hide()
      emptyPeriods();
      $("#epoqueTitre").show()
      setIndex(3);
  });


  $('.about').click(async function() {
    //affichage popup
    const index = $(this).data("index")
    const popup = $("#popup" + index);
    const closePopup = popup.find("#closePopup");
    popup.removeClass("hidden");
    closePopup.on("click", function() {
      popup.find('.popup-content').html(" ");
      popup.addClass("hidden");
    });

    //récupération nom event
    const card = $(`.card[data-index=${index}]`);
    const eventTitle = card.find('.titre').text();
    popup.find('.popup-title').html(eventTitle);

    //récupération description
    const eventLink = card.attr('id')
    const desc = await getDescription(eventLink);
    popup.find('.popup-content').html(desc);
  });

  async function getDescription(eventLink) {
    const query = `SELECT DISTINCT (COALESCE(?abstract_fr, ?abstract_en, "") AS ?abstract)
    WHERE {
      ?event owl:sameAs <${eventLink}>;
             dbo:abstract ?abstract_fr.
      OPTIONAL {
        ?event dbo:abstract ?abstract_en.
        FILTER (LANG(?abstract_en) = 'en')
      }
      FILTER (LANG(?abstract_fr) = 'fr')
    }`;

    const data = await makeSPARQLQuery(endpointUrlDbPedia, query)
    const result = data.results.bindings[0];
    if (result !== undefined && result.abstract) {
      return result.abstract.value;
    } else {
      return 'Pas de description disponible.'
    }
  }
  

  $('.era span').on('click', function(){
    const era = $(this).data('era');
    switch(era) {
      case 1:
        eventsPeriod = eventsPeriod1
        period = 1;
        break;
      case 2:
        eventsPeriod = eventsPeriod2
        period = 2;
        break;
      case 3:
        eventsPeriod = eventsPeriod3
        period = 3;
        break;
      case 4:
        eventsPeriod = eventsPeriod4
        period = 4;
        break;
    }
    $("#containerTimeline").hide()
    $("#informationsPeriode").show()
    $("#epoqueTitre").hide()
    $("#phraseResult").html("Parcourez parmi " + eventsPeriod.length + " évènements.")

    if(eventsPeriod.length > 0) {
      loadNewEvents(eventsPeriod, index)
    }
    if(eventsPeriod.length > 3) {
      rightArrow.removeClass("invisible");
    }
  })
});

