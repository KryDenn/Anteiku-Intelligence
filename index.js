const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require("discord.js");
const { REST } = require("@discordjs/rest");
const OpenAI = require("openai");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

// Configuración del bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Tokens y configuración
const { BOT_TOKEN, DEEPSEEK_API_KEY, EXCHANGE_RATE_API_KEY, CHANNEL_ID } = process.env;
if (!BOT_TOKEN) throw new Error('El BOT_TOKEN no está definido en el archivo .env');

// Configuración de OpenAI para DeepSeek
const openai = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: DEEPSEEK_API_KEY });

// Memoria global compartida y memoria por usuario
const globalMemory = [];
const userMemory = {};

// Lista de divisas
const currencies = ['USD', 'DOP', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'BRL'];

// Registrar comandos de barra
const commands = [
  new SlashCommandBuilder()
    .setName("deepthink")
    .setDescription("Envía un mensaje a DeepSeek usando el modelo R1")
    .addStringOption(option => option.setName("message").setDescription("El mensaje que deseas enviar").setRequired(true)),
  new SlashCommandBuilder()
    .setName("convertir")
    .setDescription("Convierte un monto de una moneda a otra")
    .addNumberOption(option => option.setName("monto").setDescription("Monto a convertir").setRequired(true))
    .addStringOption(option => option.setName("moneda_origen").setDescription("Moneda de origen (ej. USD)").setRequired(true).setAutocomplete(true))
    .addStringOption(option => option.setName("moneda_destino").setDescription("Moneda destino (ej. DOP)").setRequired(true).setAutocomplete(true))
];

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  try {
    console.log("Actualizando comandos de barra...");
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("¡Comandos actualizados con éxito!");
  } catch (error) {
    console.error("Error al actualizar los comandos:", error);
  }
});

async function getDeepSeekResponse(prompt, userId, model, useHistory) {
  try {
    const context = useHistory
      ? [...globalMemory, ...(userMemory[userId] || [])].slice(-10)
      : [];
    context.push({ role: "user", content: prompt });

    console.log("Solicitando a DeepSeek con contexto:", context);

    const completion = await openai.chat.completions.create({ messages: context, model });
    console.log("Respuesta recibida de DeepSeek:", completion);

    const botResponse = completion.choices[0]?.message?.content || "No se recibió una respuesta válida.";

    if (useHistory) {
      const updatedContext = [...context, { role: "assistant", content: botResponse }];
      userMemory[userId] = updatedContext;
      globalMemory.push({ role: "user", content: prompt }, { role: "assistant", content: botResponse });
    }

    return botResponse;
  } catch (error) {
    console.error("Error al obtener respuesta de DeepSeek:", error);

    if (error.type === 'invalid-json') {
      return "La respuesta de DeepSeek fue incompleta o malformada. Inténtalo nuevamente.";
    }

    return "Hubo un error procesando tu solicitud. Inténtalo de nuevo.";
  }
}

function saveCodeToFile(code, filename = "codigo.txt") {
  fs.writeFileSync(filename, code, (err) => {
    if (err) {
      console.error("Error al guardar el archivo:", err);
    } else {
      console.log("Archivo guardado como:", filename);
    }
  });
}

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);
    if (['moneda_origen', 'moneda_destino'].includes(focusedOption.name)) {
      const filteredCurrencies = currencies.filter(currency => currency.startsWith(focusedOption.value.toUpperCase()));
      await interaction.respond(filteredCurrencies.map(currency => ({ name: currency, value: currency })));
    }
  } else if (interaction.isCommand()) {
    const { commandName, options, user } = interaction;

    if (interaction.channelId !== CHANNEL_ID) {
      return interaction.reply("Este bot solo puede utilizarse en el canal especificado.");
    }

    try {
      await interaction.deferReply();
      switch (commandName) {
        case "deepthink":
          const prompt = options.getString("message");
          const botResponse = await getDeepSeekResponse(prompt, user.id, "deepseek-reasoner", false); // Sin historial

          // Verificar si la respuesta contiene código
          if (botResponse.includes('```')) {
            saveCodeToFile(botResponse, "codigo.txt");
            await interaction.followUp({
              content: "El código generado es demasiado largo. Aquí tienes el archivo con el código:",
              files: ["codigo.txt"]
            });
          } else {
            const parts = splitMessage(botResponse);
            for (const part of parts) {
              await interaction.followUp({ content: part });
            }
          }
          break;

        case "convertir":
          const amount = options.getNumber("monto");
          const fromCurrency = options.getString("moneda_origen").toUpperCase();
          const toCurrency = options.getString("moneda_destino").toUpperCase();
          const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);

          if (!exchangeRate) {
            return interaction.editReply("No se pudo obtener el tipo de cambio en este momento.");
          }

          const convertedAmount = amount * exchangeRate;
          await interaction.editReply(`${amount} ${fromCurrency} son aproximadamente ${convertedAmount.toFixed(2)} ${toCurrency}.`);
          break;

        default:
          await interaction.editReply("Comando no reconocido.");
      }
    } catch (error) {
      console.error("Error al procesar comando:", error);
      await interaction.editReply("Hubo un error procesando tu solicitud.");
    }
  }
});

async function getExchangeRate(fromCurrency, toCurrency) {
  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${fromCurrency}`);
    return response.data.conversion_rates[toCurrency];
  } catch (error) {
    console.error("Error al obtener el tipo de cambio:", error);
    return null;
  }
}

// Función para dividir mensajes largos en partes más cortas
function splitMessage(message, maxLength = 2000) {
  const parts = [];
  let currentPart = '';

  for (const line of message.split('\n')) {
    if (currentPart.length + line.length + 1 > maxLength) {
      parts.push(currentPart);
      currentPart = '';
    }
    currentPart += `${line}\n`;
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.channel.id !== CHANNEL_ID) return;

  try {
    const botResponse = await getDeepSeekResponse(message.content, message.author.id, "deepseek-chat", true); // Con historial
    const parts = splitMessage(botResponse);

    for (const part of parts) {
      await message.channel.send(part);
    }
  } catch (error) {
    console.error("Error al procesar mensaje:", error);
    message.reply("Hubo un error procesando tu mensaje.");
  }
});

client.login(BOT_TOKEN).catch(console.error);
