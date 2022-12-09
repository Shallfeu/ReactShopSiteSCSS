const fileService = require('../services/file.service')
const File = require('../models/File')
const User = require('../models/User')
const config = require('config')
const fs = require('fs')
const uuid = require('uuid')

class FileController {
    async createDir(req, res) {
        try {
            const {name, type, parent} = req.body
            const file = new File({ name, type, parent, user: req.user._id })
            const parentFile = await File.findOne({_id: parent})

            if(!parentFile) {
                file.path = name
                await fileService.createDir(file)
            } else {
                file.path = `${parentFile.path}\\${file.name}`
                await fileService.createDir(file)
                parentFile.childs.push(file._id)
                await parentFile.save()
            }
            await file.save()
            return res.json(file)
        } catch (e) {
            console.log(e)
            return res.status(500).json(e)
        }
    }

    async getFiles(req, res) {
        try {
            const files = await File.find({ user: req.user._id, parent: req.query.parent })
            return res.send(files)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Can not get files"})
        }
    }
    
    async uploadFile(req, res) {
        try {
            const file = req.files.file

            const parent = await File.findOne({ user: req.user._id, _id: req.body?.parent})
            const user = await User.findOne({ _id: req.user._id })

            let path
            if(parent) {
                path = `${config.get('filePath')}\\${user._id}\\${parent.path}\\${file.name}`
            } else {
                path = `${config.get('filePath')}\\${user._id}\\${file.name}`
            }

            if(fs.existsSync(path)) {
                return res.status(400).json({ message: 'File already exists'})
            }
            file.mv(path)

            const type = file.name.split('.').pop()
            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: parent?.path,
                parent: parent?._id,
                user: user._id
            })

            await dbFile.save()
            await user.save()

            res.send(dbFile)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Upload file error"})
        }
    }

    async uploadAvatar(req, res) {
        try {
            const file = req.files.file
            const user = await User.findById(req.user._id)
            const avatarName = await uuid.v4() + '.jpg'
            file.mv(`${config.get('staticPath')}\\${avatarName}`)
            user.avatar = avatarName
            user.save()
            return res.send(user)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Upload avatar error"})
        }
    }

    async deleteAvatar(req, res) {
        try {
            const user = await User.findById(req.user._id)
            console.log(user)
            fs.unlinkSync(`${config.get('staticPath')}\\${user.avatar}`)
            user.avatar = null
            user.save()
            return res.send(user)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Delete avatar error"})
        }
    }
}

module.exports = new FileController()

