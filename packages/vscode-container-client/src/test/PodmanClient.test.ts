/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it } from 'mocha';
import { PodmanClient } from '../clients/PodmanClient/PodmanClient';
import { WslShellCommandRunnerFactory } from '../commandRunners/wslStream';
import { expect } from 'chai';

const testDockerfileContext = '/mnt/d/vscode-docker-extensibility/packages/vscode-container-client/src/test/buildContext';
const testDockerfile = '/mnt/d/vscode-docker-extensibility/packages/vscode-container-client/src/test/buildContext/Dockerfile';

describe('PodmanClient', () => {
    const client = new PodmanClient();
    const wslRunner = new WslShellCommandRunnerFactory({ strict: true });

    describe('#version()', () => {
        it('successfully parses version end to end', async () => {
            const version = await wslRunner.getCommandRunner()(client.version({}));
            expect(version?.client).to.be.ok;
        });
    });

    describe('#checkInstall()', () => {
        it('successfully checks install end to end', async () => {
            const result = await wslRunner.getCommandRunner()(client.checkInstall({}));
            expect(result).to.have.string('podman');
        });
    });

    describe('#info()', () => {
        it('successfully parses info end to end', async () => {
            const info = await wslRunner.getCommandRunner()(client.info({}));
            expect(info.osType).to.be.ok;
            expect(info.raw).to.be.ok;
        });
    });

    describe('#getEventStream()', () => {
        xit('successfully gets events end to end', async () => {
            // TODO
        });
    });

    describe('#login()', () => {
        xit('successfully logs in end to end', async () => {
            // TODO
        });
    });

    describe('#logout()', () => {
        xit('successfully logs out end to end', async () => {
            // TODO
        });
    });

    describe('#buildImage()', () => {
        it('successfully builds images end to end', async () => {
            await wslRunner.getCommandRunner()(client.buildImage({
                path: testDockerfileContext,
                file: testDockerfile,
                tags: ['test:latest']
            }));

            const images = await wslRunner.getCommandRunner()(client.listImages({}));
            const image = images.find(i => i.image.originalName === 'localhost/test:latest');
            expect(image).to.be.ok;

            // Clean up the image so as to not interfere with the prune test
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await wslRunner.getCommandRunner()(client.removeImages({ imageRefs: [image!.id] }));
        });
    });

    describe('#pruneImage', () => {
        it('successfully prunes images end to end', async () => {
            // Build an image with no tag
            await wslRunner.getCommandRunner()(client.buildImage({
                path: testDockerfileContext,
                file: testDockerfile,
            }));

            // Prune images
            const result = await wslRunner.getCommandRunner()(client.pruneImages({}));

            expect(result).to.be.ok;
            expect(result.imageRefsDeleted).to.be.an('array').with.length.greaterThan(0);
        });
    });

    describe('#listImages()', () => {
        it('successfully lists images end to end', async () => {
            const images = await wslRunner.getCommandRunner()(client.listImages({}));
            expect(images).to.be.an('array').with.length.greaterThan(0);
            expect(images[0].id).to.be.ok;
            expect(images[0].size).to.be.ok;
            expect(images[0].image.originalName).to.be.ok;
        });
    });

    describe('#inspectImages()', () => {
        it('successfully inspects images end to end', async () => {
            const images = await wslRunner.getCommandRunner()(client.listImages({}));
            const imageInspects = await wslRunner.getCommandRunner()(client.inspectImages({ imageRefs: [images[0].id] }));
            expect(imageInspects).to.be.an('array').with.lengthOf(1);

            const image = imageInspects[0];
            expect(image.id).to.be.ok;
            expect(image.image.originalName).to.be.ok;
            expect(image.createdAt).to.be.ok;
            expect(image.raw).to.be.ok;
        });
    });
});
