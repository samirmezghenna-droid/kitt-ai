import test from"node:test";import assert from"node:assert/strict";import{localCommand,normalize,wazeUrl}from"../core.js";
test("normalise accents et casse",()=>assert.equal(normalize(" BONJOUR KITT ! "),"bonjour kitt"));
test("reconnaît Bonjour KITT",()=>assert.equal(localCommand("Bonjour KITT").type,"reply"));
test("ouvre Waze",()=>assert.equal(localCommand("Ouvre Waze").type,"navigate"));
test("heure au format HH:MM",()=>assert.match(localCommand("Quelle heure est-il ?").text,/\d{2}:\d{2}/));
test("aide locale",()=>assert.match(localCommand("Aide").text,/Waze/));
test("URL Waze",()=>assert.match(wazeUrl("Lyon"),/q=Lyon/));
test("ignore les demandes vides ou inconnues",()=>{assert.equal(localCommand(" "),null);assert.equal(localCommand("fais un salto"),null)});