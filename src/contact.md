---
title: Contact
layout: page.njk
tags: page
---



# Contact

Si vous souhaitez réagir à une note, proposer une idée ou simplement dire bonjour, voici comment me joindre :

- 📧 Par email : [baud@baud.eu.org](mailto:baud@baud.eu.org)
- 💬 Sur Mastodon : [@baudouin@fosstodon.org](https://fosstodon.org/@baudouin)
- 🧭 Ou laissez un message via le formulaire ci-dessous.

Je réponds dès que possible, en fonction des saisons du jardin.

> Ce formulaire ouvre votre client email. Si vous n’en avez pas, écrivez directement à [baud@baud.eu.org](mailto:baud@baud.eu.org).

<form class="contact-form" action="mailto:bvh@etik.com" method="post" enctype="text/plain" novalidate>
  <p id="contact-help" class="contact-help">Champs requis marqués d’un astérisque. L’envoi ouvre votre client email.</p>

  <fieldset>
    <legend>Vos coordonnées</legend>

    <label for="name">Nom <span aria-hidden="true">*</span></label>
    <input type="text" id="name" name="name" autocomplete="name" required aria-required="true" aria-describedby="contact-help">

    <label for="email">Email <span aria-hidden="true">*</span></label>
    <input type="email" id="email" name="email" autocomplete="email" required aria-required="true" aria-describedby="contact-help">
  </fieldset>

  <label for="message">Message <span aria-hidden="true">*</span></label>
  <textarea id="message" name="message" rows="6" required aria-required="true" aria-describedby="contact-help"></textarea>

  <button type="submit">Envoyer</button>
</form>
