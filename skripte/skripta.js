// Objekt, ki hrani rdeč krog z radijem hotelom
var radijHotelov;

// Seznam z oznakami na zemljevidu
var markerji = [];

// Seznam vseh parkov
var parki = [];
// Seznam vseh hotelov
var hoteli = [];
// Seznam izbranih kandidatov parkov
var kandidatiParkov = [];
// Seznam kandidatov hotelov (znotraj radija)
var kandidatiHotelov = [];
// Naziv najbližjega hotela
var najblizjiHotelNaziv;
// Oddaljenost najbližjega hotela
var najblizjiHotelOddaljenost;

// Objekt z zemljevidom
var mapa;

// Vrednosti osnovnih podatkov
var osnovniPodatki = {200: 2, 50: 1, nocitev: 3};
// Skupna vrednost turističnih bonov
var vsota;

// Največje število prikazanih točk na zemljevidu
const OMEJITEV_TOCK = 200;

// GPS koordinate FRI
const FRI_LAT = 46.05004;
const FRI_LNG = 14.46931;

/**
 * Odstrani vse točke, prikazane na zemljevidu.
 */
function odstraniVseTockeNaZemljevidu() {
    for (var i = 1; i < markerji.length; i++) {
        mapa.removeLayer(markerji[i]);
    }
}

/**
 * Ko se stran naloži, se izvedejo ukazi spodnje funkcije
 */
window.addEventListener("load", function () {
    // Osnovne lastnosti mape
    var mapOptions = {
        center: [FRI_LAT, FRI_LNG],
        zoom: 8.5,
    };

    // Ustvarimo objekt mapa
    mapa = new L.map("mapa_id", mapOptions);

    // Ustvarimo prikazni sloj mape
    var layer = new L.TileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );

    // Prikazni sloj dodamo na mapo
    mapa.addLayer(layer);

    // Ročno dodamo FRI na mapo
    dodajMarker(
        FRI_LAT,
        FRI_LNG,
        "Fakulteta za računalništvo in informatiko",
        "FRI"
    );

    izracunajVsoto();
    omogociHotele(false);

    document.getElementById("odrasli").addEventListener("change", (elem) => {
        izracunajVsoto(elem.target.value, 200);
    });

    document.getElementById("otroci").addEventListener("change", (elem) => {
        izracunajVsoto(elem.target.value, 50);
    });

    document.getElementById("nocitev").addEventListener("change", (elem) => {
        izracunajVsoto(elem.target.value);
    });

    document.getElementById("najbližjiHotel")
        .addEventListener("click", function () {
            alert(
                "Najbližji hotel je: " + najblizjiHotelNaziv +
                "\nOddaljen je: " + najblizjiHotelOddaljenost.toFixed(2) + " km."
            );
        });

    document.getElementById("radij").addEventListener("change", function () {
        prikaziHoteleZnotrajRadija();
    });
});

/**
 * Izračunaj skupno vrednost turističnih bonov
 *
 * @param kolicina količina oseb (odraslih ali otrok)
 * @param znesek znesek bona za 1 osebo (200 € za odrasle in 50 € za otroke)
 */
function izracunajVsoto(kolicina, znesek) {
    if (znesek) osnovniPodatki[znesek] = kolicina;
    else if (kolicina) osnovniPodatki["nocitev"] = kolicina;

    vsota = osnovniPodatki[200] * 200 + osnovniPodatki[50] * 50;
    document.getElementsByClassName("vsota")[0].innerHTML = vsota;
}

/**
 * Izberi korak delovanja aplikacije, in sicer 1. korak (osebe),
 * 2. korak (parki) in 3. korak (hoteli)
 *
 * @param izbirniGumb izbirni gumbi levo od zemljevida
 */
function izberiKorak(izbirniGumb) {
    //console.log(izbirniGumb);
    izbirniGumb.parentElement.style.backgroundColor = "#f2f2f2";
    var radioGumbi = document.querySelectorAll('input[type="radio"]');
    for(var i = 0;i < radioGumbi.length;i++){
        if(radioGumbi[i]!=izbirniGumb){
            radioGumbi[i].parentElement.style.backgroundColor = "transparent";
        }
    }
    odstraniVseTockeNaZemljevidu();
    //console.log(izbirniGumb.value);
    // Izvedi akcijo glede na izbran korak
    
    switch (izbirniGumb.value) {
        case "osebe":
            omogociOsnovePodatke(true);
            if (radijHotelov) mapa.removeLayer(radijHotelov);

            break;
        case "parki":
            omogociOsnovePodatke(false);

            if (radijHotelov) mapa.removeLayer(radijHotelov);

            pridobiPodatke("parki", function (jsonRezultat, vrstaInteresneTocke) {
                parki = jsonRezultat;
                izrisRezultatov(jsonRezultat, vrstaInteresneTocke);
            });
            break;
        case "hoteli":
            prikaziHoteleZnotrajRadija();
            break;
    }
    
}

/**
 * Prikaži hotele, ki ustrezajo središčni točki med izbranima parkoma in v
 * določenem radiju, ki ga izbere uporabnik.
 */
function prikaziHoteleZnotrajRadija() {
    omogociOsnovePodatke(false);

    // Preveri pogoje: izbrana 2 parka in vsota v osnovnih podatkih večjo od 0
    preveriPogojeSklopaHoteli(function () {
        var lat1 = parki[kandidatiParkov[0]].koordinate.lat;
        var lng1 = parki[kandidatiParkov[0]].koordinate.lng;

        var lat2 = parki[kandidatiParkov[1]].koordinate.lat;
        var lng2 = parki[kandidatiParkov[1]].koordinate.lng;
        var srednjaTocka = middlePoint(lat1,lng1,lat2,lng2);

        var lat3 = srednjaTocka[1];
        var lng3 = srednjaTocka[0];

        var polmer = document.getElementById("radij").value; 
        //console.log(polmer);

        // Prikaži hotele glede na radij
        pridobiPodatke("hoteli", function (jsonRezultat, vrstaInteresneTocke) {
            hoteli = jsonRezultat;

            // Izbriši radij, če je obstajal od prej
            if (radijHotelov) mapa.removeLayer(radijHotelov);

            odstraniVseTockeNaZemljevidu();

            // Nariši radij (rdeč krog v središčni točki med izbranima parkoma)
            radijHotelov = L.circle([lat3,lng3],{radius:polmer*1000,color:"red",weight:"0"});
            radijHotelov.addTo(mapa);

            // Poišči vse hotele znotraj radija
            izracunajVseHoteleVRadiju(lat3,lng3,polmer);
            // Nariši ujemajoče hotele na zemljevidu
            izrisRezultatov(kandidatiHotelov, vrstaInteresneTocke);
        });
    });
}

/**
 * Omogoči vnos podatkov pri 1. koraku (osnovni podatki)
 *
 * @param omogoci omogoči, če je true, onemogoči sicer
 */
function omogociOsnovePodatke(omogoci) {
    document.getElementById("otroci").disabled = !omogoci;
    document.getElementById("odrasli").disabled = !omogoci;
    document.getElementById("nocitev").disabled = !omogoci;
}

/**
 * Omogoči funkcionalnosti 3. koraka (hoteli)
 *
 * @param omogoci omogoči, če je tru, onemogoči sicer
 */
function omogociHotele(omogoci) {
    document.getElementById("najbližjiHotel").disabled = !omogoci;
    document.getElementById("radij").disabled = !omogoci;
}

/**
 * Poišči vse hotele v podanem radiju od središčne točke
 * @param lat zemljepisna širina središčne točke
 * @param lng zemljepisna dolžina središčne točke
 * @param radij polmer iskanja
 */
function izracunajVseHoteleVRadiju(lat, lng, radij) {
    if (typeof radij == "string") radij = parseInt(radij);

    najblizjiHotelOddaljenost = Number.MAX_SAFE_INTEGER;

    // Izprazni seznam potencialnih hotelov
    kandidatiHotelov = [];
    for (let i = 0; i < hoteli.length; i++) {
        // Izračunaj oddaljenost hotela od središčne točke
        var oddaljenost = distance(lat, lng, hoteli[i].koordinate.lat, hoteli[i].koordinate.lng, "K");

        // Če je oddaljenost hotela manjša od radija, ga dodaj na seznam
        if (oddaljenost <= radij) {
            kandidatiHotelov.push(hoteli[i]);
        }
    }
    //console.log(kandidatiHotelov[0]);
    for(let i = 0;i < kandidatiHotelov.length;i++){
        var razdalja = distance(lat,lng,kandidatiHotelov[i].koordinate.lat,kandidatiHotelov[i].koordinate.lng,"K");
        if(razdalja < najblizjiHotelOddaljenost){
            najblizjiHotelOddaljenost = razdalja;
            najblizjiHotelNaziv = kandidatiHotelov[i].lastnosti.ime+","+kandidatiHotelov[i].lastnosti.mesto;
        }
    }

}

/**
 * Preveri pogoje pri 3. koraku (hoteli), in sicer morata biti izbrana vsaj
 * 2 parka in skupni znesek v osnovnih podatkih mora biti več kot 0.
 *
 * @param callback povratni klic oz. funkcija, ki se pokliče ob uspešnem zaključku
 */
function preveriPogojeSklopaHoteli(callback) {
    var sporocilo = "";
    var stOdraslih = parseInt(document.getElementById("odrasli").value);
    var stOtrok = parseInt(document.getElementById("otroci").value);
    if(!(stOtrok&&stOdraslih)){
        sporocilo += "Skupni znesek v osnovnih podatkih mora biti več kot 0 €!\n";
    }
    if(kandidatiParkov.length < 2){
        sporocilo += "Izbrati je potrebno 2 parka!";
    }

    if (!sporocilo) {
        callback();
    }else{
        alert(sporocilo);
    }
    omogociHotele(!sporocilo);
    return;
}

/**
 * Dodaj izbrani park na zemljevidu na seznam parkov
 *
 * @param indeks enolični identifikator parka
 */
function dodajParkMedKandidate(indeks) {
    var tabelaParkov = document.getElementById("tabelaParkov");
    //console.log(parki[indeks]);
    if (!(kandidatiParkov.includes(indeks))&&kandidatiParkov.length < 2) {
        // Dodaj novo vrstico v seznam parkov
        var vrstica = tabelaParkov.insertRow(tabelaParkov.rows.length);
        // Dodaj prazni celici (prva je za ime parka in njegovo oceno, druga pa za
        // gumb za odstranjevanje iz seznama)
        //console.log(vrstica);
        var stolpec1 = vrstica.insertCell(0);
        var stolpec2 = vrstica.insertCell(1);
        //console.log(this);
        stolpec1.innerHTML = "<strong>" +parki[indeks].lastnosti.ime+"</strong>"+" z oceno "+"<strong>"+ parki[indeks].lastnosti.ocena+"</strong>";
        stolpec2.innerHTML = "<button type='button' onclick='odstraniKotKandidata(this,"+indeks+")' class='senca rob'><i class='far fa-trash-alt'></i></button>";
        
        // Dodaj park na seznam
        kandidatiParkov.push(indeks);
        //console.log(kandidatiParkov);
        
        // Zapri pojavno okno s podrobnostmi parka
        mapa.closePopup();
    }
}

/**
 * Odstrani park iz seznama parkov
 *
 * @param vrsticaVTabeli vrstica v tabeli
 * @param indeks enolični identifikator parka
 */
function odstraniKotKandidata(vrsticaVTabeli, indeks) {
    var tabelaParkov = document.getElementById("tabelaParkov");
    tabelaParkov.deleteRow(vrsticaVTabeli.parentElement.parentElement.rowIndex);
    kandidatiParkov.splice(kandidatiParkov.indexOf(indeks), 1);
}

/**
 * Na zemljevid dodaj izbrane interesne točke.
 */
function akcijaIzbire() {
    var izbira = document.getElementById("izbira").value;

    pridobiPodatke(function (izbira) {
        },
        function (jsonRezultat) {
            izrisRezultatov(jsonRezultat);
        }
    );
}

/**
 * Za podano vrsto interesne točke dostopaj do JSON datoteke
 * in vsebino JSON datoteke vrni v povratnem klicu.
 *
 * @param vrstaInteresneTocke "fakultete" ali "kulturne_dediscine"
 * @param callback povratni klic z vsebino zahtevane JSON datoteke
 */
function pridobiPodatke(vrstaInteresneTocke, callback) {
    if (typeof vrstaInteresneTocke != "string") return;

    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    var streznik = "https://teaching.lavbic.net/cdn/OIS/DN1/";
    xobj.open("GET", streznik + vrstaInteresneTocke + ".json", true);
    xobj.onreadystatechange = function () {
        // Rezultat ob uspešno prebrani datoteki
        if (xobj.readyState == 4 && xobj.status == "200") {
            var json = JSON.parse(xobj.responseText);

            // Vrnemo rezultat
            callback(json, vrstaInteresneTocke);
        }
    };
    xobj.send(null);
}

/**
 * Dodaj izbrano oznako na zemljevid na določenih GPS koordinatah,
 * z dodatnim opisom, ki se prikaže v oblačku ob kliku in barvo
 * ikone, glede na tip oznake (FRI = črna, parki = zelena in
 * hoteli = modra)
 *
 * @param lat zemljepisna širina
 * @param lng zemljepisna dolžina
 * @param vsebinaHTML, vsebina v HTML obliki ki se prikaže v oblačku
 * @param vrstaInteresneTocke, vrsta interesne točke (npr. park ali hotel)
 */
function dodajMarker(lat, lng, vsebinaHTML, vrstaInteresneTocke) {
    var streznik = "https://teaching.lavbic.net/cdn/OIS/DN1/";
    var ikona = new L.Icon({
        iconUrl:
            streznik + "marker-icon-2x-" +
            (vrstaInteresneTocke == "FRI" ? "black" : vrstaInteresneTocke == "parki" ? "green" : "blue") + ".png",
        shadowUrl: streznik + "marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    // Ustvarimo marker z vhodnima podatkoma koordinat
    // in barvo ikone, glede na tip
    var marker = L.marker([lat, lng], {icon: ikona});

    // Izpišemo želeno sporočilo v oblaček
    marker.bindPopup(vsebinaHTML).openPopup();

    marker.addTo(mapa);
    markerji.push(marker);
}

/**
 * Na podlagi podanih interesnih točk v GeoJSON obliki izriši
 * posamezne točke na zemljevid, in sicer največ 200 interesnih točk.
 *
 * @param jsonRezultat interesne točke v JSON obliki
 * @param vrstaInteresneTocke vrsta interesne točke (npr. park ali hotel)
 */
function izrisRezultatov(jsonRezultat, vrstaInteresneTocke) {
    for (var i = 0; i < jsonRezultat.length; i++) {
        var lat = jsonRezultat[i].koordinate.lat;
        var lng = jsonRezultat[i].koordinate.lng;

        var vsebinaHTML = "";
        if (vrstaInteresneTocke == "parki") {
            vsebinaHTML =
                "<div class='sredina'><strong>" + jsonRezultat[i].lastnosti.ime + "</strong><br>ocena: <strong>" +
                jsonRezultat[i].lastnosti.ocena + "<strong><br>" +
                "<img src='https://teaching.lavbic.net/cdn/OIS/DN1/ikona-park.png' style='margin-top:10px'>" +
                "<br><button onclick='dodajParkMedKandidate(" + i + ")' class='kandidati rob senca' id='" +
                vrstaInteresneTocke + "_" + i + "'>Dodaj med kandidate</button></div>";
        } else {
            vsebinaHTML =
                "<div class='sredina'><i class='fas fa-hotel'></i><strong>" +
                jsonRezultat[i].lastnosti.ime + "</strong><div style='margin-top:5px'></div>" +
                jsonRezultat[i].lastnosti.mesto + "<br>Zvezdice: " + jsonRezultat[i].lastnosti.zvezdice +
                "<div style='margin-top:5px'></div>" + "<i class='fas fa-money-bill-wave'></i><strong>Doplačilo: " +
                izracunajDoplacilo(jsonRezultat[i]) + "</strong></div>";
        }

        dodajMarker(lat, lng, vsebinaHTML, vrstaInteresneTocke, i < OMEJITEV_TOCK);
    }
}

/**
 * Za izbrani hotel izračunaj zahtevano doplačilo, glede na vrednost
 * turističnega bona družine.
 *
 * @param hotel hotel, za katerega računamo doplačilo
 */
function izracunajDoplacilo(hotel) {
    var skupnaCena =
        (hotel.lastnosti.cenaOtroci * osnovniPodatki[50] +
            hotel.lastnosti.cenaOdrasli * osnovniPodatki[200]) *
        osnovniPodatki.nocitev;
    return skupnaCena > vsota ? skupnaCena - vsota + " €" : "nič";
}
