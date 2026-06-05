// ─────────────────────────────────────────────────────────────────────────────
// main.ts — The Genesis. The Big Bang. The moment NestJS takes a deep breath
// and decides, against all odds, to become a server.
// If something is wrong here, nothing else matters. Truly the main event.
// ─────────────────────────────────────────────────────────────────────────────

// The architect of the entire application — without NestFactory, we are nothing.
// Just a collection of TypeScript files weeping into the void.
import { NestFactory } from '@nestjs/core';

// ValidationPipe: the bouncer who actually reads IDs. Logger: our one source of truth
// in a world full of lies and missing env variables.
import { ValidationPipe, Logger } from '@nestjs/common';

// Swagger — because apparently writing actual documentation is beneath us,
// so we auto-generate it and call it a day. Respect, honestly.
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// The root of all things. The AppModule. The One Module to rule them all.
// (And in the darkness, bind them.)
import { AppModule } from './app.module';

// Catches HTTP exceptions before they escape into the wild and embarrass us.
// Think of it as emotional damage control for your API.
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Transforms outgoing responses into something civilized.
// Raw data is for databases. Humans deserve structure. (Or so we tell ourselves.)
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * bootstrap — The function that starts it all.
 *
 * Named "bootstrap" because every framework needs at least one word
 * that makes you feel like you're building something important.
 * Spoiler: you are. Probably. No guarantees.
 *
 * This function:
 * - Summons the app from the ether
 * - Tells CORS who it can and cannot trust (very relatable energy)
 * - Attaches every global guard, filter, pipe, and interceptor
 * - Generates Swagger docs nobody will read until something breaks
 * - Listens on a port and prays
 */
async function bootstrap() {
  // The logger — our only companion in the dark container runtime.
  // "Bootstrap" context because 'main.ts' felt too honest.
  const logger = new Logger('Bootstrap');

  // Summon the application. This either works or it doesn't.
  // There is no try-catch here. We live dangerously.
  const app = await NestFactory.create(AppModule);

  // ── CORS Configuration ────────────────────────────────────────────────────
  // Who gets to talk to us? An exclusive list.
  // localhost:3000 always makes the cut — it's the loyal friend who shows up
  // even when you're in development limbo at 2am.
  const allowedOrigins = [
    'http://localhost:3000',
    // Pull in any extra frontends from env. Because one frontend is never enough.
    // (Whoever added FRONTEND_URL support — I see you. I appreciate you.)
    ...(process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
      : []),
  ];

  // Enable CORS with a custom origin validator.
  // If you're not on the list, you're not coming in.
  // Curl and Postman get a free pass because we're not monsters.
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      // Basically everyone who doesn't announce themselves gets in free.
      // Like a nightclub that only rejects people who RSVP'd.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // You are not on the list. The list does not know you. Goodbye.
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    // Credentials: true, because cookies deserve to travel too.
    // They've been through enough.
    credentials: true,
  });

  // ── Global Exception Filter ───────────────────────────────────────────────
  // Catch HTTP exceptions globally so they don't crash the whole party.
  // The HTTP Exception Filter: therapist for your API's worst days.
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global Transform Interceptor ──────────────────────────────────────────
  // Intercepts all responses and makes them look intentional.
  // Raw data out, structured responses in. Civilization, basically.
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Global Validation Pipe ────────────────────────────────────────────────
  // The validation pipeline — rejects all garbage input before it can
  // poison our sacred database. Like a spiritual cleanser, but for JSON.
  app.useGlobalPipes(
    new ValidationPipe({
      // Strips any properties that weren't explicitly whitelisted.
      // Your extra fields are not welcome here. We know what we asked for.
      whitelist: true,
      // Auto-transforms incoming primitives to their declared types.
      // Because "42" the string and 42 the number are NOT the same thing,
      // no matter what JavaScript's type coercion says at 3am.
      transform: true,
      // Throws an error if non-whitelisted properties are sent.
      // We're not just silently ignoring you — we're loudly rejecting you.
      forbidNonWhitelisted: true,
    }),
  );

  // ── Swagger API Documentation ─────────────────────────────────────────────
  // The thing we set up so we can say "yes, we have docs."
  // Nobody reads it until the frontend dev asks "what does this endpoint return"
  // at 4:57pm on a Friday. Then suddenly it's the most important page on earth.
  const config = new DocumentBuilder()
    // The grand title. Very official. Very blockchain. Very NFT.
    .setTitle('NeXus NFT Launchpad API')
    // The description: succinct, professional, hiding all the chaos beneath.
    .setDescription('Backend API for NeXus NFT Launchpad')
    // Version 1.0 — because we haven't broken it enough times yet to hit v2.
    .setVersion('1.0')
    // Bearer auth — for the JWT holders among us. Very exclusive club.
    .addBearerAuth()
    // API key auth — for the IPFS endpoints that need a secret handshake.
    // The x-api-key header: our velvet rope in header form.
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API key for authenticating requests to IPFS endpoints',
      },
      'ApiKeyAuth',
    )
    .build();

  // Generate the actual Swagger document. This is the moment the docs materialize.
  // Like a phoenix, but made of JSON schema and developer suffering.
  const document = SwaggerModule.createDocument(app, config);

  // Mount Swagger at /api/docs — the promised land of self-documenting APIs.
  // Go forth and explore. But maybe don't commit the API key to the repo.
  SwaggerModule.setup('api/docs', app, document);

  // Register shutdown hooks — so when the process dies, it dies gracefully.
  // Unlike most things in this industry, we clean up after ourselves.
  app.enableShutdownHooks();

  // ── The Moment of Truth ───────────────────────────────────────────────────
  // Pick a port. Any port. (Defaults to 8000 because 3000 was already taken
  // by the frontend and 4000 was taken by someone's personal project.)
  const port = process.env.PORT || 8000;

  // Start listening. This is it. This is the moment.
  // Either it works, or we spend the next 45 minutes reading stack traces.
  await app.listen(port);

  // Log the good news. We made it. Against all odds, we are running.
  logger.log(`Backend running on http://localhost:${port}`);

  // Log the docs URL — bookmark it now. You'll need it when the frontend
  // asks "wait, does this endpoint accept a body or query params?"
  logger.log(`API docs available at http://localhost:${port}/api/docs`);
}

// Pull the trigger. Start the engine. Light the fuse.
// Everything that happens after this line is someone else's problem.
// (It's our problem. It's always our problem.)
bootstrap();

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Coded by Juan — The boot sequence of a platform that takes JPEGs
 * and puts them on a blockchain. We live in the future. It's chaotic here.
 * If this file fails, nothing runs. No pressure. Just everything.
 * ─────────────────────────────────────────────────────────────────────────────
 */
