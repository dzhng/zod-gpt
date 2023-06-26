import { RecursiveCharacterTextSplitter } from './text-splitter';

describe('RecursiveCharacterTextSplitter', () => {
  it('Should correctly spilt text by seperators', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 50,
      chunkOverlap: 10,
    });
    expect(
      splitter.splitText(
        'Hello world, this is a test of the recursive text splitter.',
      ),
    ).toMatchSnapshot();

    splitter.chunkSize = 100;
    expect(
      splitter.splitText(
        'Hello world, this is a test of the recursive text splitter. If I have a period, it should split along the period.',
      ),
    ).toMatchSnapshot();

    splitter.chunkSize = 110;
    const res = splitter.splitText(
      'Hello world, this is a test of the recursive text splitter. If I have a period, it should split along the period.\nOr, if there is a new line, it should prioritize splitting on new lines instead.',
    );
    expect(res).toMatchSnapshot();
    expect(res.map((r) => r.length)).toMatchSnapshot();
  });
});
