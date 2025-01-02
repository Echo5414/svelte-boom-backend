// https://github.com/strapi/strapi/tree/146a31b564bc8232686331f6b28f7ff966817963/packages/core/upload/server/src/services

import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import type { Sharp } from 'sharp';

const DEBUG_LOGGING = process.env.DEBUG_UPLOAD === 'true';

function debugLog(message: string, data?: any) {
  if (DEBUG_LOGGING) {
    if (data) {
      console.log(message, JSON.stringify(data, null, 2));
    } else {
      console.log(message);
    }
  }
}

console.log('Loading upload extension...');

// Simplified Sharp loading
let sharp;
try {
  process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = "1";
  sharp = require('sharp');
} catch (error) {
  console.error('Failed to load sharp:', error);
}

interface FileFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: string | null;
  size: number;
  width: number;
  height: number;
}

interface UploadFile {
  id: number;
  name: string;
  mime: string;
  url: string;
  hash: string;
  ext: string;
  formats?: {
    large?: FileFormat;
    small?: FileFormat;
    medium?: FileFormat;
    thumbnail?: FileFormat;
    xlarge?: FileFormat;
    [key: string]: FileFormat | undefined;
  };
}

interface StrapiPlugin {
  controllers: {
    'admin-upload': {
      upload?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      uploadLocal?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      uploadStream?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      [key: string]: ((ctx: Context, next: () => Promise<any>) => Promise<any>) | undefined;
    };
    'upload': {
      upload?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      uploadFiles?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      uploadStream?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      [key: string]: ((ctx: Context, next: () => Promise<any>) => Promise<any>) | undefined;
    };
    'content-api': {
      upload?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      uploadFiles?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      uploadStream?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
      [key: string]: ((ctx: Context, next: () => Promise<any>) => Promise<any>) | undefined;
    };
  };
  routes: {
    'admin': {
      type: string;
      routes: any[];
    };
    'content-api': {
      type: string;
      routes: {
        method: string;
        path: string;
        handler: string;
      }[];
    };
    [key: string]: any;
  };
}

interface StrapiUploadPlugin extends StrapiPlugin {
  services: {
    upload: {
      upload: (ctx: any) => Promise<any>;
      uploadFiles: (ctx: any) => Promise<any>;
    };
  };
}

interface WebPSettings {
  quality: number;
  lossless: boolean;
  effort: number;
}

interface FolderStructure {
  api: string;
  admin: {
    images: string;
    videos: string;
    default: string;
  };
}

interface ImageProcessingConfig {
  outputOptions: {
    default: {
      outputFormat: string;
      responsiveFormats: boolean;
      settings: {
        quality: number;
        [format: string]: any;
      };
    };
    exceptions: {
      [key: string]: string[];
    };
  };
}

function hasException(formatConfig: string[], flag: string): boolean {
  return formatConfig.includes(flag);
}

interface UploadConfig {
  provider: string;
  providerOptions: {
    sizeLimit: number;
  };
  breakpoints: {
    thumbnail: { width: number; height: number };
    small: { width: number };
    medium: { width: number };
    large: { width: number };
  };
  folderStructure: FolderStructure;
  settings: {
    webp: WebPSettings;
    generateResponsiveFormats: boolean;
    imageProcessing: ImageProcessingConfig;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var strapi: Core.Strapi;
}

export default (plugin: StrapiUploadPlugin) => {
  console.log('Upload plugin extension loading with details:', {
    adminMethods: {
      controller: 'admin-upload',
      methods: Object.keys(plugin.controllers['admin-upload'] || {})
    },
    uploadMethods: {
      controller: 'upload',
      methods: Object.keys(plugin.controllers['upload'] || {})
    },
    contentApiMethods: {
      controller: 'content-api',
      methods: Object.keys(plugin.controllers['content-api'] || {})
    }
  });

  // Log detailed route information
  console.log('Content API routes:', JSON.stringify(plugin.routes['content-api'], null, 2));

  // Disable all image manipulation functions
  plugin.services['image-manipulation'] = () => ({
    generateThumbnail: () => null,
    optimize: () => null,
    isSupportedImage: () => false,  // Tell Strapi no images need processing
    getDimensions: () => null,
    generateResponsiveFormats: () => null,
    isOptimizableImage: () => false,
    isImage: () => false
  });

  // Helper function to process images using buffer approach
  async function safeImageProcess(inputPath: string, outputPath: string, processor: (sharp: Sharp) => Sharp): Promise<void> {
    let sharpInstance = null;
    try {
      // Read file into buffer
      const inputBuffer = await require('fs').promises.readFile(inputPath);
      
      // Create Sharp instance and process buffer
      sharpInstance = sharp(inputBuffer);
      const outputBuffer = await processor(sharpInstance).toBuffer();
      
      // Write processed buffer to output
      await require('fs').promises.writeFile(outputPath, outputBuffer);
    } catch (error) {
      throw error;
    } finally {
      // Clean up Sharp instance
      if (sharpInstance) {
        sharpInstance.destroy();
      }
    }
  }

  // Process files according to configuration
  async function processImage(files: any[], ctx: Context) {
    const config = strapi.config.get('plugin::upload') as UploadConfig;
    const { outputOptions } = config.settings.imageProcessing;
    const { default: defaultConfig, exceptions } = outputOptions;

    for (const file of files) {
      if (file.mime?.startsWith('image/')) {
        try {
          const filePath = require('path').join(
            strapi.dirs.static.public,
            file.url.replace(/^\//, '')
          );

          console.log('Processing image:', filePath);

          const fileFormat = file.mime.split('/')[1];
          const formatConfig = exceptions[fileFormat] || [];
          let formats = {};

          // Generate responsive formats first if enabled and disableProcessingResponsive is set
          if (defaultConfig.responsiveFormats && 
              !hasException(formatConfig, 'disableResponsive') && 
              hasException(formatConfig, 'disableProcessingResponsive')) {
            let metadataInstance = null;
            try {
              metadataInstance = sharp(filePath);
              const metadata = await metadataInstance.metadata();
              const originalWidth = metadata.width || 0;

              // Use original format since we're preserving it
              const outputExt = file.ext.replace('.', '');
              const outputMime = file.mime;

              for (const [name, dimensions] of Object.entries(config.breakpoints)) {
                if (dimensions.width >= originalWidth) {
                  console.log(`Skipping ${name} format - target width larger than original`);
                  continue;
                }

                const formatPath = filePath.replace(/(\.[^.]+)$/, `-${name}.${outputExt}`);
                
                const processor = (sharpInstance: Sharp) => {
                  sharpInstance.resize({
                    width: dimensions.width,
                    height: 'height' in dimensions ? dimensions.height : undefined,
                    fit: 'height' in dimensions ? 'cover' : 'inside',
                    withoutEnlargement: true
                  });

                  return sharpInstance;
                };

                await safeImageProcess(filePath, formatPath, processor);

                const formatUrl = formatPath.split('public')[1]?.replace(/\\/g, '/');
                if (!formatUrl) continue;

                formats[name] = {
                  ext: `.${outputExt}`,
                  url: formatUrl.startsWith('/') ? formatUrl : '/' + formatUrl,
                  hash: formatUrl.replace(/\.[^.]+$/, ''),
                  mime: outputMime,
                  name: formatPath.split(/[\\/]/).pop() || '',
                  path: null,
                  size: (await require('fs').promises.stat(formatPath)).size,
                  width: dimensions.width,
                  height: 'height' in dimensions ? dimensions.height : undefined
                };
              }
            } finally {
              if (metadataInstance) {
                metadataInstance.destroy();
              }
            }

            // Update formats in database before main file conversion
            await strapi.db.query('plugin::upload.file').update({
              where: { id: file.id },
              data: { formats }
            });
            file.formats = formats;
          }

          // Handle format conversion unless disableProcessing is set
          if (!hasException(formatConfig, 'disableProcessing')) {
            const outputPath = filePath.replace(/\.[^.]+$/, `.${defaultConfig.outputFormat}`);
            
            const processor = (sharpInstance: Sharp) => {
              const format = defaultConfig.outputFormat;
              const formatSettings = {
                quality: defaultConfig.settings.quality,
                ...(defaultConfig.settings[format] || {})
              };

              if (typeof sharpInstance[format] === 'function') {
                return sharpInstance[format](formatSettings);
              }

              return sharpInstance;
            };

            await safeImageProcess(filePath, outputPath, processor);
            
            // Update file metadata for converted files
            const newUrl = file.url.replace(/\.[^.]+$/, `.${defaultConfig.outputFormat}`);
            await strapi.db.query('plugin::upload.file').update({
              where: { id: file.id },
              data: {
                mime: `image/${defaultConfig.outputFormat}`,
                ext: `.${defaultConfig.outputFormat}`,
                url: newUrl,
                hash: file.hash.replace(/\.[^.]+$/, `.${defaultConfig.outputFormat}`),
                name: file.name.replace(/\.[^.]+$/, `.${defaultConfig.outputFormat}`)
              }
            });

            file.mime = `image/${defaultConfig.outputFormat}`;
            file.ext = `.${defaultConfig.outputFormat}`;
            file.url = newUrl;
            file.hash = file.hash.replace(/\.[^.]+$/, `.${defaultConfig.outputFormat}`);
            file.name = file.name.replace(/\.[^.]+$/, `.${defaultConfig.outputFormat}`);
          }

          // Generate responsive formats if enabled and not already done
          if (defaultConfig.responsiveFormats && 
              !hasException(formatConfig, 'disableResponsive') && 
              !hasException(formatConfig, 'disableProcessingResponsive')) {
            let metadataInstance = null;
            try {
              metadataInstance = sharp(filePath);
              const metadata = await metadataInstance.metadata();
              const originalWidth = metadata.width || 0;

              // Use target format since we're not preserving original
              const outputExt = defaultConfig.outputFormat;
              const outputMime = `image/${defaultConfig.outputFormat}`;

              for (const [name, dimensions] of Object.entries(config.breakpoints)) {
                if (dimensions.width >= originalWidth) {
                  console.log(`Skipping ${name} format - target width larger than original`);
                  continue;
                }

                const formatPath = filePath.replace(/(\.[^.]+)$/, `-${name}.${outputExt}`);
                
                const processor = (sharpInstance: Sharp) => {
                  sharpInstance.resize({
                    width: dimensions.width,
                    height: 'height' in dimensions ? dimensions.height : undefined,
                    fit: 'height' in dimensions ? 'cover' : 'inside',
                    withoutEnlargement: true
                  });

                  if (typeof sharpInstance[outputExt] === 'function') {
                    sharpInstance[outputExt](defaultConfig.settings[outputExt] || defaultConfig.settings);
                  }

                  return sharpInstance;
                };

                await safeImageProcess(filePath, formatPath, processor);

                const formatUrl = formatPath.split('public')[1]?.replace(/\\/g, '/');
                if (!formatUrl) continue;

                formats[name] = {
                  ext: `.${outputExt}`,
                  url: formatUrl.startsWith('/') ? formatUrl : '/' + formatUrl,
                  hash: formatUrl.replace(/\.[^.]+$/, ''),
                  mime: outputMime,
                  name: formatPath.split(/[\\/]/).pop() || '',
                  path: null,
                  size: (await require('fs').promises.stat(formatPath)).size,
                  width: dimensions.width,
                  height: 'height' in dimensions ? dimensions.height : undefined
                };
              }
            } finally {
              if (metadataInstance) {
                metadataInstance.destroy();
              }
            }

            // Update formats in database after main file conversion
            await strapi.db.query('plugin::upload.file').update({
              where: { id: file.id },
              data: { formats }
            });
            file.formats = formats;
          }

          // Log success with settings
          const formatSpecificSettings = {
            quality: defaultConfig.settings.quality,
            ...(defaultConfig.settings[fileFormat] || {})
          };
          const settingsStr = Object.entries(formatSpecificSettings)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ');
          console.log(`Successfully processed: ${file.name}; Format: ${fileFormat}; Settings: ${settingsStr}`);

        } catch (error) {
          console.error('Processing failed for file:', file.name, error);
          throw error;
        }
      }
    }
  }

  // Helper function to process files including moving to API Uploads
  async function processAPIUploadFiles(files: any[], ctx: Context) {
    const config = strapi.config.get('plugin::upload') as UploadConfig;
    const apiFolder = config.folderStructure.api.replace(/^\//, '');

    // First convert to WebP
    await processImage(files, ctx);
    
    // Then handle API-specific folder moving and updates
    for (const file of files) {
      // Create API folder directory if it doesn't exist
      const apiUploadsDir = require('path').join(strapi.dirs.static.public, 'uploads', apiFolder);
      if (!require('fs').existsSync(apiUploadsDir)) {
        require('fs').mkdirSync(apiUploadsDir, { recursive: true });
      }

      const fs = require('fs');
      const path = require('path');

      // Helper function to move a file
      const moveFile = (oldRelativePath: string) => {
        const oldPath = path.join(strapi.dirs.static.public, oldRelativePath.replace(/^\//, ''));
        const fileName = path.basename(oldRelativePath);
        const newPath = path.join(apiUploadsDir, fileName);
        
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          return `/uploads/${apiFolder}/${fileName}`;
        }
        return oldRelativePath;
      };

      // Move the main file
      const newMainUrl = moveFile(file.url);
      
      // Move all format files
      if (file.formats) {
        for (const [formatName, format] of Object.entries(file.formats)) {
          const typedFormat = format as FileFormat;
          const newFormatUrl = moveFile(typedFormat.url);
          typedFormat.url = newFormatUrl;
          typedFormat.hash = typedFormat.hash.replace(/[^\/]+$/, apiFolder);
        }
      }

      // First, create or get the API folder in the Media Library
      let folder = await strapi.db.query('plugin::upload.folder').findOne({
        where: { name: apiFolder }
      });

      if (!folder) {
        const maxPathId = await strapi.db.query('plugin::upload.folder')
          .findMany({
            select: ['pathId'],
            orderBy: { pathId: 'desc' },
            limit: 1
          })
          .then(results => results[0]?.pathId || 0);

        folder = await strapi.db.query('plugin::upload.folder').create({
          data: {
            name: apiFolder,
            pathId: maxPathId + 1,
            path: `/${apiFolder}`
          }
        });
      }

      // Update the database and response object
      await strapi.db.query('plugin::upload.file').update({
        where: { id: file.id },
        data: {
          url: newMainUrl,
          folder: folder.id,
          folderPath: `/${apiFolder}`,
          formats: file.formats
        }
      });
      file.url = newMainUrl;
    }
  }

  // Helper function to safely stringify files object
  function formatFileInfo(file: any) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModifiedDate: file.lastModifiedDate,
      filepath: file.filepath,
      mimetype: file.mimetype
    };
  }

  // Override admin upload
  const adminUpload = plugin.controllers['admin-upload'];
  if (adminUpload?.uploadFiles) {
    console.log('Setting up admin upload override...');
    const originalUploadFiles = adminUpload.uploadFiles;

    adminUpload.uploadFiles = async (ctx: Context, next: () => Promise<any>) => {
      try {
        debugLog('Admin upload intercepted:', {
          body: ctx.request.body,
          files: ctx.request.files?.files ? formatFileInfo(ctx.request.files.files) : null
        });

        await originalUploadFiles.apply(adminUpload, [ctx, next]);
        debugLog('Admin upload result:', ctx.body);

        const uploadedFiles = Array.isArray(ctx.body) ? ctx.body : [ctx.body];
        await processImage(uploadedFiles, ctx);

        debugLog('Admin upload completed:', uploadedFiles);
        return ctx.body;
      } catch (error) {
        console.error('Admin upload error:', error);
        throw error;
      }
    };
  }

  // Create a new content-api controller
  plugin.controllers['content-api'] = {
    ...plugin.controllers['content-api'],
    
    // Upload method for POST /
    upload: async (ctx: Context, next: () => Promise<any>) => {
      try {
        debugLog('API upload intercepted:', {
          url: ctx.url,
          body: ctx.request.body,
          files: ctx.request.files?.files ? formatFileInfo(ctx.request.files.files) : null
        });

        const files = ctx.request.files?.files 
          ? Array.isArray(ctx.request.files.files)
            ? ctx.request.files.files
            : [ctx.request.files.files]
          : [];

        const uploadService = strapi.plugin('upload').service('upload');
        const fileInfo = JSON.parse(ctx.request.body.fileInfo || '{}');

        // First, let Strapi handle the normal upload
        const result = await uploadService.upload({
          data: fileInfo,
          files: files
        });

        debugLog('API upload result:', result);
        const uploadedFiles = Array.isArray(result) ? result : [result];

        // Then convert to WebP (this will use the original path)
        await processAPIUploadFiles(uploadedFiles, ctx);
        
        debugLog('API upload completed:', uploadedFiles);
        ctx.body = result;
        return result;
      } catch (error) {
        console.error('API upload error:', error);
        throw error;
      }
    },

    // Find method for GET /files
    find: async (ctx: Context) => {
      const uploadService = strapi.plugin('upload').service('upload');
      const files = await uploadService.find(ctx.query);
      ctx.body = files;
      return files;
    },

    // FindOne method for GET /files/:id
    findOne: async (ctx: Context) => {
      const { id } = ctx.params;
      const uploadService = strapi.plugin('upload').service('upload');
      const file = await uploadService.findOne(id);
      ctx.body = file;
      return file;
    },

    // Destroy method for DELETE /files/:id
    destroy: async (ctx: Context) => {
      const { id } = ctx.params;
      const uploadService = strapi.plugin('upload').service('upload');
      const file = await uploadService.remove(id);
      ctx.body = file;
      return file;
    }
  };

  // Override upload service to handle format conversion and responsive formats
  plugin.services.upload.uploadFiles = async (ctx) => {
    const uploadResponse = await plugin.services.upload.upload.call(this, ctx);

    // Process files after they're fully uploaded
    for (const file of uploadResponse) {
      if (file.mime?.startsWith('image/')) {
        try {
          const filePath = require('path').join(
            strapi.dirs.static.public,
            file.url.replace(/^\//, '')
          );

          console.log('Processing image:', filePath);

          const config = strapi.config.get('plugin::upload') as UploadConfig;
          const { outputOptions } = config.settings.imageProcessing;
          const { default: defaultConfig, exceptions } = outputOptions;
          const fileFormat = file.mime.split('/')[1];
          const formatConfig = exceptions[fileFormat] || [];

          // Skip processing if configured to do so in exceptions
          if (hasException(formatConfig, 'disableProcessing')) {
            console.log(`Skipping processing for ${file.name} due to disableProcessing config`);
            continue;
          }

          const targetFormat = defaultConfig.outputFormat;
          const formatSettings = {
            quality: defaultConfig.settings.quality,
            ...(defaultConfig.settings[targetFormat] || {})
          };

          // Convert main file to target format using safe processing
          const outputPath = filePath.replace(/\.[^.]+$/, `.${targetFormat}`);
          await safeImageProcess(filePath, outputPath, (sharpInstance) => 
            sharpInstance[targetFormat](formatSettings)
          );

          // Process responsive formats if enabled and not skipped
          if (file.formats && !hasException(formatConfig, 'disableResponsive')) {
            for (const [formatName, format] of Object.entries(file.formats)) {
              const typedFormat = format as FileFormat;
              const formatPath = require('path').join(
                strapi.dirs.static.public,
                typedFormat.url.replace(/^\//, '')
              );

              // Determine format based on configuration
              const outputFormat = hasException(formatConfig, 'disableProcessingResponsive') ? fileFormat : targetFormat;
              const outputSettings = hasException(formatConfig, 'disableProcessingResponsive') ? {} : formatSettings;
              const outputFormatPath = formatPath.replace(/\.[^.]+$/, `.${outputFormat}`);

              // Process responsive format using safe processing
              await safeImageProcess(formatPath, outputFormatPath, (sharpInstance) => 
                sharpInstance[outputFormat](outputSettings)
              );

              // Update format metadata to match processed file
              typedFormat.ext = `.${outputFormat}`;
              typedFormat.mime = `image/${outputFormat}`;
              typedFormat.url = typedFormat.url.replace(/\.[^.]+$/, `.${outputFormat}`);
              typedFormat.hash = typedFormat.hash.replace(/\.[^.]+$/, `.${outputFormat}`);
            }
          }

          // Update main file metadata in database
          await strapi.db.query('plugin::upload.file').update({
            where: { id: file.id },
            data: {
              mime: `image/${targetFormat}`,
              ext: `.${targetFormat}`,
              url: file.url.replace(/\.[^.]+$/, `.${targetFormat}`),
              hash: file.hash.replace(/\.[^.]+$/, `.${targetFormat}`),
              name: file.name.replace(/\.[^.]+$/, `.${targetFormat}`),
              formats: file.formats
            }
          });

          // Log success with settings
          const formatSpecificSettings = {
            quality: defaultConfig.settings.quality,
            ...(defaultConfig.settings[targetFormat] || {})
          };
          const settingsStr = Object.entries(formatSpecificSettings)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ');
          console.log(`Successfully processed: ${file.name}; Format: ${targetFormat}; Settings: ${settingsStr}`);

        } catch (error) {
          console.error('Image conversion failed for file:', file.name, error);
        }
      }
    }

    return uploadResponse;
  };

  return plugin;
}; 