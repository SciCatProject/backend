import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('Dacat API')
    .setDescription('SciCat backend API')
    .setVersion('4.0.0')
    .addTag('scicat')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('explorer', app, document);

  const port = process.env.PORT || 3000;
  Logger.log('Scicat backend Catamel listening on port: ' + port);

  await app.listen(port);
}
bootstrap();