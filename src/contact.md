---
title: Contact
layout: page.njk
tags: page
description: Comment contacter le jardinier
---



# Contact

Si vous souhaitez réagir à une note, proposer une idée ou simplement dire bonjour, voici comment me joindre :

- 📧 Par email : <button type="button" id="email-reveal" class="email-reveal" aria-controls="email-address">Afficher l’adresse e-mail</button><a id="email-address" class="email-address" aria-live="polite" hidden></a>
- 💬 Sur Mastodon : [@baudouinvh@mastodon.social](https://mastodon.social/@baudouinvh)
- 🧭 Ou laissez un message via le formulaire ci-dessous.

Je réponds dès que possible, en fonction des saisons du jardin.

<p class="contact-help">Le formulaire prépare un message dans votre application de messagerie.</p>

<form class="contact-form" id="contact-form">
  <label for="name">Nom</label>
  <input type="text" id="name" name="name" required>

  <label for="email">Email</label>
  <input type="email" id="email" name="email" required>

  <label for="message">Message</label>
  <textarea id="message" name="message" rows="6" required></textarea>

  <button type="submit">Préparer le message</button>
</form>

<noscript><p class="contact-help">Activez JavaScript pour afficher l’adresse e-mail et utiliser le formulaire.</p></noscript>

<script>
  (() => {
    const address = String.fromCharCode(98, 118, 104, 64, 115, 99, 114, 105, 112, 116, 111, 114, 46, 112, 114, 111);
    const reveal = document.getElementById("email-reveal");
    const emailLink = document.getElementById("email-address");
    const form = document.getElementById("contact-form");

    reveal?.addEventListener("click", () => {
      emailLink.href = `mailto:${address}`;
      emailLink.textContent = address;
      emailLink.hidden = false;
      reveal.textContent = "Adresse affichée";
      reveal.disabled = true;
    });

    form?.addEventListener("submit", event => {
      event.preventDefault();
      const fields = new FormData(form);
      const subject = encodeURIComponent(`Message du site — ${fields.get("name") || "Visiteur"}`);
      const body = encodeURIComponent(`Nom : ${fields.get("name")}\nAdresse de réponse : ${fields.get("email")}\n\n${fields.get("message")}`);
      window.location.href = `mailto:${address}?subject=${subject}&body=${body}`;
    });
  })();
</script>
