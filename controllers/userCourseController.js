const { Op } = require('sequelize')

// prettier-ignore
const {
  Course, Module, Video, Category, sequelize, UserCourse,
} = require('../models')
const ApiError = require('../utils/apiError')

const getUserCourses = async (req, res, next) => {
  const categoryIds = req.query.categoryIds
    ? req.query.categoryIds.split(',')
    : []
  const titleSearch = req.query.title || ''
  const courseTypeSearch = req.query.courseType || ''
  const levelSearch = req.query.level || ''
  const whereClause = {}

  if (categoryIds.length > 0) {
    whereClause.categoryId = {
      [Op.in]: categoryIds,
    }
  }

  if (titleSearch) {
    whereClause.title = {
      [Op.iLike]: `%${titleSearch}%`,
    }
  }

  if (courseTypeSearch) {
    whereClause.courseType = courseTypeSearch
  }

  if (levelSearch) {
    whereClause.level = levelSearch
  }
  try {
    const dataUserCourse = await Course.findAll({
      include: [
        {
          model: UserCourse,
          where: {
            userId: req.user.id,
          },
          attributes: [], // Exclude UserCourse attributes from the result
        },
        {
          model: Module,
          attributes: [],
        },
        {
          model: Category,
          attributes: ['name'],
        },
      ],
      raw: true,
      group: ['Courses.id', 'Categories.id'],
      attributes: [
        'Courses.id',
        'Courses.name',
        'Categories.name',
        [
          sequelize.fn('SUM', sequelize.col('Courses.Modules.duration')),
          'totalDuration',
        ],
      ],
    })
    // const dataCourse = await Course.findAll({
    //   include: [
    //     {
    //       model: Module,
    //       attributes: [],
    //     },
    //     {
    //       model: Category,
    //       attributes: ['name'],
    //     },
    //     // {
    //     //   model: UserCourse,
    //     //   attributes: [],
    //     // },
    //   ],
    //   where: {
    //     ...whereClause,
    //   },
    //   raw: true,
    //   group: ['Course.id', 'Category.id'],
    //   attributes: [
    //     '*',
    //     [
    //       sequelize.fn('SUM', sequelize.col('Modules.duration')),
    //       'totalDuration',
    //     ],
    //   ],
    // })

    const data = dataUserCourse.map((course) => {
      const categoryInfo = {
        name: course['Category.name'],
      }
      return { ...course, 'Category.name': undefined, Category: categoryInfo }
    })
    return res.status(200).json({
      success: true,
      message: 'Success, fetch',
      data,
    })
  } catch (error) {
    return next(new ApiError(error.message, 500))
  }
}

const getUserCourse = async (req, res, next) => {
  const { id } = req.params
  try {
    const data = await Course.findOne({
      where: { id },
      include: [
        {
          model: Category,
          attributes: { exclude: ['id', 'createdAt', 'updatedAt'] },
        },
        {
          model: Module,
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: [
            {
              model: Video,
              attributes: { exclude: ['createdAt', 'updatedAt'] },
            },
          ],
        },
      ],
    })
    const totalDuration = await Module.sum('duration', {
      where: {
        courseId: id,
      },
    })
    return res.status(200).json({
      success: true,
      message: 'Success, fetch',
      data: {
        ...data.toJSON(),
        totalDuration,
      },
    })
  } catch (error) {
    return next(new ApiError(error.message, 500))
  }
}

// const updateCourseProgress = async (req, res, next) => {
//   const { id } = req.params
// }

module.exports = {
  getUserCourses,
  getUserCourse,
  // updateCourseProgress,
}
