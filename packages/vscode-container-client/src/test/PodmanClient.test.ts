/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';
import { describe, it } from 'mocha';
import { PodmanClient } from '../clients/PodmanClient/PodmanClient';
import { WslShellCommandRunnerFactory } from '../commandRunners/wslStream';
import { expect } from 'chai';
import { PodmanListImageRecord } from '../clients/PodmanClient/PodmanListImageRecord';
//import { ShellStreamCommandRunnerFactory } from '../commandRunners/shellStream';

const testDockerUsername = '';
const testDockerPat = '';

const testDockerfileContext = '/mnt/d/vscode-docker-extensibility/packages/vscode-container-client/src/test/buildContext';
const testDockerfile = '/mnt/d/vscode-docker-extensibility/packages/vscode-container-client/src/test/buildContext/Dockerfile';
//const testDockerfileContext = 'D:\\vscode-docker-extensibility\\packages\\vscode-container-client\\src\\test\\buildContext';
//const testDockerfile = 'D:\\vscode-docker-extensibility\\packages\\vscode-container-client\\src\\test\\buildContext\\Dockerfile';

xdescribe('PodmanClient', () => {
    const client = new PodmanClient();
    const wslRunner = new WslShellCommandRunnerFactory({ strict: true });
    //const wslRunner = new ShellStreamCommandRunnerFactory({ strict: true });

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

    describe('#login() and #logout()', () => {
        it('successfully logs in end to end', async () => {
            // Create a stream to write the PAT into
            const stdInPipe = stream.Readable.from(testDockerPat);
            const runner = new WslShellCommandRunnerFactory({ strict: true, stdInPipe: stdInPipe });

            // Log in
            await runner.getCommandRunner()(client.login({
                registry: 'docker.io',
                username: testDockerUsername,
                passwordStdIn: true,
            }));
        });

        it('successfully logs out end to end', async () => {
            await wslRunner.getCommandRunner()(client.logout({ registry: 'docker.io' }));
        });
    });

    describe('List images with same name', () => {
        it('correctly parses images that have the same name', async () => {
            const image: PodmanListImageRecord = {
                Created: 1619710180,
                Id: "3a093384ac7f6f4f1d1b3f0b2d5b0d6c0c5c8a1e2d6f8f2a8b8a4f6c0a4c8d5f",
                Names: [
                    "foo",
                    "bar"
                ],
                Size: 0,
            };

            const images: PodmanListImageRecord[] = [
                image,
                image, // Podman will have the exact same image twice if it has two tags
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reparsedImages = await ((client as any).parseListImagesCommandOutput({}, JSON.stringify(images), true));
            expect(reparsedImages).to.be.an('array').with.lengthOf(2);
            expect(reparsedImages[0].image.originalName).to.equal('foo');
            expect(reparsedImages[1].image.originalName).to.equal('bar');
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

    describe('Containers Big End To End', function () {
        this.timeout(10000);

        let containerId: string;

        before(async () => {
            // Start a container detached so it stays up
            containerId = await wslRunner.getCommandRunner()(client.runContainer({
                imageRef: 'alpine:latest',
                detached: true,
                labels: {
                    "FOO": "BAR"
                },
            })) as string;
            expect(containerId).to.be.ok;
        });

        it('successfully lists containers end to end', async () => {
            const containers = await wslRunner.getCommandRunner()(client.listContainers({}));
            expect(containers).to.be.an('array').with.length.greaterThan(0);
            expect(containers[0].id).to.equal(containerId);
            expect(containers[0].image).to.be.ok;
            expect(containers[0].createdAt).to.be.ok;
            expect(containers[0].status).to.be.ok;

            // Stop the container
            const stopped = await wslRunner.getCommandRunner()(client.stopContainers({ container: [containerId], time: 1 }));
            expect(stopped).to.be.an('array').with.lengthOf(1);
            expect(stopped[0]).to.equal(containerId);

            // Inspect the container
            const inspected = await wslRunner.getCommandRunner()(client.inspectContainers({ containers: [containerId] }));
            expect(inspected).to.be.an('array').with.lengthOf(1);
            expect(inspected[0].id).to.equal(containerId);
            expect(inspected[0].image).to.be.ok;
            expect(inspected[0].createdAt).to.be.ok;
            expect(inspected[0].status).to.equal('exited');
        });

        after(async () => {
            // Remove the container
            const removed = await wslRunner.getCommandRunner()(client.removeContainers({ containers: [containerId], force: true }));
            expect(removed).to.be.an('array').with.lengthOf(1);
            expect(removed[0]).to.equal(containerId);
        });
    });

    describe('#pruneContainers()', () => {
        it('successfully prunes containers end to end', async () => {
            // Start a hello-world container which will immediately exit
            const containerId = await wslRunner.getCommandRunner()(client.runContainer({
                imageRef: 'hello-world',
                detached: true,
            }));

            expect(containerId).to.be.ok;
            if (!containerId) {
                expect.fail('containerId should not be undefined');
            }

            // Stop it to make sure it's good and stopped
            await wslRunner.getCommandRunner()(client.stopContainers({ container: [containerId], time: 1 }));


            // Prune containers
            const result = await wslRunner.getCommandRunner()(client.pruneContainers({}));
            expect(result).to.be.ok;
            expect(result.containersDeleted).to.be.an('array').with.lengthOf(1);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(result.containersDeleted![0]).to.equal(containerId);
        });
    });

    describe('#listNetworks()', () => {
        it('successfully lists networks end to end', async () => {
            const networks = await wslRunner.getCommandRunner()(client.listNetworks({}));
            expect(networks).to.be.an('array').with.length.greaterThan(0);
            expect(networks[0].name).to.be.ok;
        });
    });

    describe('#pruneNetworks()', () => {
        it('successfully prunes networks end to end', async () => {
            // Create a network
            await wslRunner.getCommandRunner()(client.createNetwork({
                name: 'prune-test-network',
            }));

            // Prune networks
            const result = await wslRunner.getCommandRunner()(client.pruneNetworks({}));
            expect(result).to.be.ok;
            expect(result.networksDeleted).to.be.an('array').with.length.greaterThan(0);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(result.networksDeleted![0]).to.equal('prune-test-network');
        });
    });

    describe('#inspectNetworks()', () => {
        it('successfully inspects networks end to end', async () => {
            const networks = await wslRunner.getCommandRunner()(client.listNetworks({}));
            const networkInspects = await wslRunner.getCommandRunner()(client.inspectNetworks({ networks: [networks[0].name] }));
            expect(networkInspects).to.be.an('array').with.lengthOf(1);

            const network = networkInspects[0];
            expect(network.name).to.be.ok;
            expect(network.raw).to.be.ok;
        });
    });

    describe('#listVolumes()', () => {
        it('successfully lists volumes end to end', async () => {
            // Create a volume
            try {
                await wslRunner.getCommandRunner()(client.createVolume({
                    name: 'list-test-volume',
                }));
            } catch {
                // No-op
            }

            const volumes = await wslRunner.getCommandRunner()(client.listVolumes({}));
            expect(volumes).to.be.an('array').with.length.greaterThan(0);
            expect(volumes[0].name).to.be.ok;
        });
    });

    describe('#pruneVolumes()', () => {
        it('successfully prunes volumes end to end', async () => {
            // Create a volume
            try {
                await wslRunner.getCommandRunner()(client.createVolume({
                    name: 'prune-test-volume',
                }));
            } catch {
                // No-op
            }

            // Prune volumes
            const result = await wslRunner.getCommandRunner()(client.pruneVolumes({}));
            expect(result).to.be.ok;
            expect(result.volumesDeleted).to.be.an('array').with.length.greaterThan(0);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(result.volumesDeleted![0]).to.have.string('test-volume');
        });
    });

    describe('#inspectVolumes()', () => {
        it('successfully inspects volumes end to end', async () => {
            // Create a volume
            try {
                await wslRunner.getCommandRunner()(client.createVolume({
                    name: 'inspect-test-volume',
                }));
            } catch {
                // No-op
            }

            const volumes = await wslRunner.getCommandRunner()(client.listVolumes({}));
            const volumeInspects = await wslRunner.getCommandRunner()(client.inspectVolumes({ volumes: [volumes[0].name] }));
            expect(volumeInspects).to.be.an('array').with.lengthOf(1);

            const volume = volumeInspects[0];
            expect(volume.name).to.be.ok;
            expect(volume.raw).to.be.ok;
        });
    });

    describe('Filesystem Big End To End', function () {
        this.timeout(10000);
        let containerId: string;

        before(async () => {
            // Create a container
            containerId = await wslRunner.getCommandRunner()(client.runContainer({
                imageRef: 'alpine:latest',
                detached: true,
            })) as string;
            expect(containerId).to.be.ok;
        });

        it('successfully does filesystem operations', async () => {
            // List files in /etc
            const files = await wslRunner.getCommandRunner()(client.listFiles({
                path: '/etc',
                container: containerId
            }));
            expect(files).to.be.an('array').with.length.greaterThan(0);
            const file = files[0];
            expect(file.name).to.be.ok;
            expect(file.type).to.be.ok;
            expect(file.size).to.be.ok;
            expect(file.mode).to.be.ok;

            // Stat /etc/hosts
            const stat = await wslRunner.getCommandRunner()(client.statPath({
                path: '/etc/hosts',
                container: containerId
            }));

            expect(stat).to.be.ok;
            if (!stat) {
                expect.fail('stat should not be undefined');
            }
            expect(stat.name).to.be.ok;
            expect(stat.type).to.be.ok;
            expect(stat.size).to.be.ok;
            expect(stat.mode).to.be.ok;
            expect(stat.mtime).to.be.ok;
            expect(stat.ctime).to.be.ok;

            // Read /etc/hosts
            const generator = wslRunner.getStreamingCommandRunner()(client.readFile({
                container: containerId,
                path: '/etc/hosts',
                operatingSystem: 'linux',
            }));

            for await (const chunk of generator) {
                expect(chunk).to.be.ok;
                expect(chunk.toString('utf-8')).to.be.ok;
            }
        });

        xit('successfully writes a file', async () => {
            // TODO
        });

        after(async () => {
            // Clean up the container
            await wslRunner.getCommandRunner()(client.stopContainers({ container: [containerId], time: 1 }));
            await wslRunner.getCommandRunner()(client.removeContainers({ containers: [containerId], force: true }));
        });
    });
});
