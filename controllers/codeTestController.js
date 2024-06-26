const fs = require("fs");
const path = require('path');
const { exec } = require("child_process");
const { easy, hard, medium } = require("../constants/QB");
const { ans } = require("../constants/ANS");
const getQuestionDetails = async (qId) => {
    if (qId.slice(0, 2) === 'qs') {
        return easy.filter((item) => {
            return (item.qId === qId);
        })
    }
    else if (qId.slice(0, 2) === 'qh') {
        return hard.filter((item) => {
            return (item.qId === qId)
        });
    }
    else {
        return medium.filter((item) => {
            return (item.qId === qId)
        });
    }
}
const getEasyAnswer = async (ansId) => {
    return ans.filter((item) => {
        return (item.ansId === ansId)
    });
}
const runCodeController = async (req, res, filename) => {
    const buildName = filename + new Date().getTime();
    const { qId } = req.body;
    var quesDetails = await getQuestionDetails(qId);
    quesDetails = quesDetails[0];
    const validatorName = quesDetails.ansId;
    const testCaseName = quesDetails.tcId;
    console.log(validatorName, testCaseName);
    const validatorBuild = validatorName.substring(0, validatorName.indexOf(".c"));
    exec(`gcc ${filename} -o ${buildName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Compilation error: ${stderr}`);
            res.json({ message: 'Internal Server Error', status: false });
            return;
        }

        exec(`gcc ${validatorName} -o ${validatorBuild}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Compilation error: ${stderr}`);
                res.json({ message: 'Internal Server Error', status: false });
                return;
            }

            exec(`${buildName} < ${testCaseName} | ${validatorBuild}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Execution error: ${stderr}`);
                    res.json({ message: 'Internal Server Error', status: false });
                    return;
                }

                const output = stdout.trim();
                if (output === "true") {
                    res.json({ message: "Successfull Submission!", status: true, bonus: quesDetails.bonus });
                }
                else {
                    res.json({ message: "Wrong output!", status: true, bonus: 0 });
                }
            })
        })
    })
}
const validateEasyQuestion = async (req, res, difficulty) => {
    try {
        const { code, qId } = req.body;
        var quesDetails = await getQuestionDetails(qId);
        quesDetails = quesDetails[0];
        var userCode = code.trim();
        var ans = await getEasyAnswer(quesDetails.ansId);
        ans = ans[0].ans;
        if (difficulty === "medium") {
            userCode = userCode = userCode.replace(/\s/g, '');
        }
        console.log(userCode);
        if (userCode === ans) {
            res.json({ message: "Successfull Submission!", status: true, bonus: quesDetails.bonus });
        }
        else {
            res.json({ message: "Wrong output!", status: false, bonus: 0 });
        }
    } catch (error) {
        console.log(error);
        return res.json({ message: 'Internal Server Error', status: false });
    }
}
const codeTestPipeline = async (req, res) => {
    const { code, submissionId, qId, difficulty } = req.body;
    const fileName = `${submissionId}.c`;
    const directoryPath = path.join("./", 'codes');
    const filePath = path.join(directoryPath, fileName);
    if (difficulty === "easy" || difficulty === "medium") {
        validateEasyQuestion(req, res, difficulty);
        return;
    }
    else {
        try {
            fs.mkdir(directoryPath, { recursive: true }, (err) => {
                if (err) {
                    console.error('Error creating directory:', err);
                    res.json({ message: 'Internal Server Error', status: false });
                    return;
                }

                fs.writeFile(filePath, code, (err) => {
                    if (err) {

                        console.error('Error writing C code to file:', err);
                        res.json({ message: 'Internal Server Error', status: false });
                        return;
                    }
                    console.log(`C code saved to ${filePath}`);
                    runCodeController(req, res, filePath);
                });
            });
        } catch (error) {
            return res.json({ message: 'Internal Server Error', status: false });
        }
    }
}

module.exports = { codeTestPipeline };